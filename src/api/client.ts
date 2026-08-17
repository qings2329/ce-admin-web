// 管理后台 API 客户端：统一调用 cmd/admin 的 /api/admin/* 接口。
// 通过 Vite 代理（/api/admin -> cmd/admin :8095）访问；注入 admin Bearer Token，
// 统一解包 {code,message,data} 响应体。管理 token 为单 token（无 refresh，原型）。

const TOKEN = "cx_admin_token";
const PERMS = "cx_admin_perms";

export const tokenStore = {
  get access() {
    return localStorage.getItem(TOKEN);
  },
  hasToken() {
    return !!localStorage.getItem(TOKEN);
  },
  set(token: string) {
    localStorage.setItem(TOKEN, token);
  },
  get perms(): string[] {
    try {
      const raw = localStorage.getItem(PERMS);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  },
  setPerms(p: string[]) {
    localStorage.setItem(PERMS, JSON.stringify(p ?? []));
  },
  clear() {
    localStorage.removeItem(TOKEN);
    localStorage.removeItem(PERMS);
  },
};

export class ApiError extends Error {
  code: number;
  status: number;
  constructor(message: string, code: number, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) headers.set("Content-Type", "application/json");
  const token = tokenStore.access;
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, { ...init, headers });
  let body: any = null;
  try {
    body = await res.json();
  } catch {
    /* 非 JSON 响应 */
  }
  if (!res.ok) {
    const msg = body?.message || res.statusText || "请求失败";
    throw new ApiError(msg, body?.code ?? -1, res.status);
  }
  if (body && typeof body === "object" && "data" in body) return body.data as T;
  return body as T;
}

export const api = {
  // ---- 管理员登录（可选 totp：启用 Google 验证器后必填） ----
  login: (username: string, password: string, totp?: string) =>
    request<{ token: string; expires_in: number; totp_required: boolean }>("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password, totp }),
    }),

  get: <T = any>(path: string) => request<T>(path),
  post: <T = any>(path: string, body: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T = any>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  del: <T = any>(path: string) => request<T>(path, { method: "DELETE" }),

  // ---- 风控与强平监控 ----
  getRisk: () => request("/api/admin/risk"),

  // ---- 用户与账户管理 ----
  listUsers: () => request<any[]>("/api/admin/users"),
  createUser: (u: any) => request("/api/admin/users", { method: "POST", body: JSON.stringify(u) }),
  updateUser: (id: number, patch: any) =>
    request(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  freezeUser: (id: number) => request(`/api/admin/users/${id}/freeze`, { method: "POST" }),
  unfreezeUser: (id: number) => request(`/api/admin/users/${id}/unfreeze`, { method: "POST" }),

  // ---- 交易对/参数配置 ----
  listSymbols: () => request<any[]>("/api/admin/symbols"),
  upsertSymbol: (s: any) =>
    request("/api/admin/symbols", { method: "POST", body: JSON.stringify(s) }),

  // ---- 运营看板：账本 + 服务健康 + 通知 ----
  getLedger: () => request("/api/admin/ledger"),
  getServices: () => request<any[]>("/api/admin/services"),
  listNotifications: () => request<any[]>("/api/admin/notifications"),
  createNotification: (n: any) =>
    request("/api/admin/notifications", { method: "POST", body: JSON.stringify(n) }),
  deleteNotification: (id: number) => request(`/api/admin/notifications/${id}`, { method: "DELETE" }),

  // ---- 充值提币记录 ----
  listDeposits: () => request<any[]>("/api/admin/deposits"),
  listWithdrawals: () => request<any[]>("/api/admin/withdrawals"),
  approveWithdrawal: (id: number) =>
    request(`/api/admin/withdrawals/${id}/approve`, { method: "POST" }),
  rejectWithdrawal: (id: number) =>
    request(`/api/admin/withdrawals/${id}/reject`, { method: "POST" }),

  // ---- 公链管理 ----
  listChains: () => request<any[]>("/api/admin/chains"),
  createChain: (c: any) => request("/api/admin/chains", { method: "POST", body: JSON.stringify(c) }),
  updateChain: (id: number, patch: any) =>
    request(`/api/admin/chains/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

  // ---- 币种管理 ----
  listCoins: () => request<any[]>("/api/admin/coins"),
  createCoin: (c: any) => request("/api/admin/coins", { method: "POST", body: JSON.stringify(c) }),
  updateCoin: (id: number, patch: any) =>
    request(`/api/admin/coins/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

  // ---- 当前管理员自身 ----
  me: () => request<any>("/api/admin/me"),
  changePassword: (old_password: string, new_password: string) =>
    request("/api/admin/password", {
      method: "POST",
      body: JSON.stringify({ old_password, new_password }),
    }),

  // ---- Google 验证器（MFA） ----
  mfaSetup: () => request<{ secret: string; otpauth_uri: string }>("/api/admin/mfa/setup", { method: "POST", body: "{}" }),
  mfaEnable: (code: string) =>
    request("/api/admin/mfa/enable", { method: "POST", body: JSON.stringify({ code }) }),
  mfaDisable: (code?: string) =>
    request("/api/admin/mfa/disable", {
      method: "POST",
      body: JSON.stringify(code ? { code } : {}),
    }),

  // ---- 管理员账户管理（需 admin:manage） ----
  listAdmins: () => request<any[]>("/api/admin/admins"),
  createAdmin: (a: any) =>
    request("/api/admin/admins", { method: "POST", body: JSON.stringify(a) }),
  updateAdmin: (id: number, patch: any) =>
    request(`/api/admin/admins/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  activateAdmin: (id: number) =>
    request(`/api/admin/admins/${id}/activate`, { method: "POST", body: "{}" }),
  disableAdmin: (id: number) =>
    request(`/api/admin/admins/${id}/disable`, { method: "POST", body: "{}" }),
  resetAdminPassword: (id: number, password: string) =>
    request(`/api/admin/admins/${id}/reset-password`, {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  // ---- 角色与权限管理（需 role:manage） ----
  listRoles: () => request<any[]>("/api/admin/roles"),
  createRole: (r: any) =>
    request("/api/admin/roles", { method: "POST", body: JSON.stringify(r) }),
  setRolePermissions: (id: number, permissions: string[]) =>
    request(`/api/admin/roles/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    }),
  deleteRole: (id: number) => request(`/api/admin/roles/${id}`, { method: "DELETE" }),
  listPermissions: () => request<any[]>("/api/admin/permissions"),
};
