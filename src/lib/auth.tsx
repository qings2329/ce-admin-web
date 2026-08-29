import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, onSessionExpired, tokenStore } from "../api/client";
import { PERMISSIONS } from "./permissions";

// 超级管理员全量权限（原型/后端未返回权限时兜底）
const SUPER_ADMIN_PERMS = Object.keys(PERMISSIONS) as string[];

interface AuthCtxValue {
  authed: boolean;
  perms: string[]; // 当前管理员生效的细粒度权限（用于前端按钮/导航显隐）
  role: string;    // 角色标签：super_admin / compliance / operator
  login: (username: string, password: string, totp?: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthCtx = createContext<AuthCtxValue>({
  authed: false,
  perms: [],
  role: "operator",
  login: async () => {},
  logout: () => {},
  refreshMe: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(tokenStore.hasToken());
  const [perms, setPerms] = useState<string[]>(tokenStore.perms);
  const [role, setRole] = useState<string>("operator");

  // 根据 perms 推断角色标签
  const computeRole = (p: string[]) => {
    if (p.includes("super_admin") || p.length === 0) return "super_admin";
    if (p.includes("risk:view") && p.includes("finance:approve")) return "compliance";
    return "operator";
  };

  const login = async (username: string, password: string, totp?: string) => {
    const res = await api.login(username, password, totp);
    tokenStore.set(res.token);
    await refreshMe();
    setAuthed(true);
  };

  const refreshMe = async () => {
    try {
      const me = await api.me();
      const p: string[] = me.permissions ?? [];
      // 后端未返回权限时（原型/未配置），默认赋予超级管理员全量权限
      const resolved = p.length > 0 ? p : SUPER_ADMIN_PERMS;
      tokenStore.setPerms(resolved);
      setPerms(resolved);
      setRole(computeRole(resolved));
    } catch {
      // 接口不可达时仍展示全部菜单，保证原型可运行
      tokenStore.setPerms(SUPER_ADMIN_PERMS);
      setPerms(SUPER_ADMIN_PERMS);
      setRole("super_admin");
    }
  };

  const logout = () => {
    tokenStore.clear();
    setPerms([]);
    setRole("operator");
    setAuthed(false);
    location.hash = "/login";
  };

  // 注册会话过期回调：token 失效时由请求层统一触发登出跳转。
  useEffect(() => {
    onSessionExpired(() => {
      sessionStorage.setItem("auth_expired", "1");
      logout();
    });
  }, []);

  return (
    <AuthCtx.Provider value={{ authed, perms, role, login, logout, refreshMe }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

// 前端语义权限（如 user:view）→ 后端实际返回的细粒度权限（如 user:read）。
// 后端权限粒度更细（resource:action），这里做显式映射，使菜单/页面级权限能正确匹配。
const PERM_ALIASES: Record<string, string[]> = {
  "risk:view": ["risk:read", "risk:view"],
  "user:view": ["user:read", "user:write", "kyc:read", "kyc:write"],
  "user:write": ["user:write", "user:read"],
  "trade:view": ["trade:read", "trade:manage"],
  "trade:manage": ["trade:manage", "trade:read"],
  "audit:view": ["audit:read", "audit:view"],
  "apikey:view": ["apikey:read", "apikey:manage"],
  "apikey:manage": ["apikey:manage", "apikey:read"],
  "finance:view": ["deposit:read", "deposit:write", "ledger:read", "ledger:write", "withdraw:read"],
  "finance:approve": ["withdraw:approval", "withdraw:read", "withdraw:write"],
  "c2c:view": ["c2c:read", "c2c:manage", "c2c:write"],
  "c2c:manage": ["c2c:manage", "c2c:write", "c2c:read"],
  "admin:manage": ["admin:manage", "admin:read", "user:read"],
  "role:manage": ["role:read", "role:manage", "role:write", "user:read"],
  "system:config": ["symbol:read", "symbol:write", "coin:read", "coin:write", "chain:read", "chain:write"],
  "sys:settings": ["sys:settings", "sys:read", "service:read", "service:write"],
  "ops:view": ["ops:view", "ops:read", "dashboard:view", "dashboard:read"],
  "notification:write": ["notification:manage", "notification:read", "notification:write"],
  "announcement:write": ["announcement:read", "announcement:write", "announcement:manage"],
};

// hasPerm 判断权限集合是否包含给定权限之一（支持前端语义权限映射到后端细粒度权限）。
export function hasPerm(perms: string[], ...need: string[]): boolean {
  if (need.length === 0) return true;
  const expanded = need.flatMap((n) => [n, ...(PERM_ALIASES[n] ?? [])]);
  return expanded.some((n) => perms.includes(n));
}
