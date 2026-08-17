import { createContext, useContext, useState, type ReactNode } from "react";
import { api, tokenStore } from "../api/client";

interface AuthCtxValue {
  authed: boolean;
  perms: string[]; // 当前管理员生效的细粒度权限（用于前端按钮/导航显隐）
  login: (username: string, password: string, totp?: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
}

const AuthCtx = createContext<AuthCtxValue>({
  authed: false,
  perms: [],
  login: async () => {},
  logout: () => {},
  refreshMe: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState<boolean>(tokenStore.hasToken());
  const [perms, setPerms] = useState<string[]>(tokenStore.perms);

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
      tokenStore.setPerms(p);
      setPerms(p);
    } catch {
      setPerms([]);
    }
  };

  const logout = () => {
    tokenStore.clear();
    setPerms([]);
    setAuthed(false);
    location.hash = "/login";
  };

  return (
    <AuthCtx.Provider value={{ authed, perms, login, logout, refreshMe }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

// hasPerm 判断权限集合是否包含给定权限之一。
export function hasPerm(perms: string[], ...need: string[]): boolean {
  if (need.length === 0) return true;
  return need.some((n) => perms.includes(n));
}
