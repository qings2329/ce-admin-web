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

// 会话过期回调：由 AuthProvider 注册，在 token 失效（401）时触发登出跳转。
type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;
export function onSessionExpired(handler: SessionExpiredHandler) {
  sessionExpiredHandler = handler;
}

// 邀请佣金记录（GET /api/admin/referral/commissions）。
export interface Commission {
  id: number;
  referrer_id: number;
  taker_id: number;
  asset: string;
  amount: number;
  rate: number;
  status: number;
  biz_ref: string;
  created_at: string;
  updated_at: string;
}

// buildQuery 把过滤参数拼成查询串，跳过空值（undefined/null/空字符串）。
function buildQuery(params?: Record<string, any>): string {
  if (!params) return "";
  const us = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    us.set(k, String(v));
  }
  const s = us.toString();
  return s ? `?${s}` : "";
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
    // token 已存在却收到 401（后端返回 HTTP 401 或业务码 401，表示 token 过期/失效），
    // 触发登出并跳转到登录页；无 token（如登录失败）时不触发，避免误跳转。
    const unauthorized = res.status === 401 || body?.code === 401;
    if (unauthorized && token) {
      sessionExpiredHandler?.();
    }
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
  listUsers: (params?: Record<string, any>) =>
    request<{ items: any[]; total: number }>("/api/admin/users" + buildQuery(params)),
  createUser: (u: any) => request("/api/admin/users", { method: "POST", body: JSON.stringify(u) }),
  updateUser: (id: number, patch: any) =>
    request(`/api/admin/users/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  freezeUser: (id: number) => request(`/api/admin/users/${id}/freeze`, { method: "POST" }),
  unfreezeUser: (id: number) => request(`/api/admin/users/${id}/unfreeze`, { method: "POST" }),
  resetUserTFA: (id: number) => request(`/api/admin/users/${id}/tfa/reset`, { method: "POST" }),
  getUserBalances: (id: number) =>
    request<{ user_id: number; assets: { asset: string; available: number; frozen: number; withdraw_frozen: number; exists: boolean }[]; total_assets: number }>(
      `/api/admin/users/${id}/balances`
    ),

  // ---- 交易对/参数配置 ----
  listSymbols: (params?: Record<string, any>) =>
    request<{ items: any[]; total: number }>("/api/admin/symbols" + buildQuery(params)),
  upsertSymbol: (s: any) =>
    request("/api/admin/symbols", { method: "POST", body: JSON.stringify(s) }),

  // ---- 运营看板：账本 + 服务健康 + 通知 ----
  getLedger: () => request("/api/admin/ledger"),
  getServices: () => request<any[]>("/api/admin/services"),
  listNotifications: (params?: Record<string, any>) =>
    request<{ items: any[]; total: number }>("/api/admin/notifications" + buildQuery(params)),
  createNotification: (n: any) =>
    request("/api/admin/notifications", { method: "POST", body: JSON.stringify(n) }),
  deleteNotification: (id: number) => request(`/api/admin/notifications/${id}`, { method: "DELETE" }),

  // ---- 充值提币记录 ----
  listDeposits: (params?: Record<string, any>) =>
    request<{ deposits: any[]; total: number }>("/api/admin/deposits" + buildQuery(params)),
  listWithdrawals: (params?: Record<string, any>) =>
    request<{ withdrawals: any[]; total: number }>("/api/admin/withdrawals" + buildQuery(params)),
  approveWithdrawal: (id: number | string) =>
    request(`/api/admin/withdrawals/${id}/approve`, { method: "POST" }),
  rejectWithdrawal: (id: number | string) =>
    request(`/api/admin/withdrawals/${id}/reject`, { method: "POST" }),

  // ---- 用户充值地址（按 user_id 在各充值链确定性派生）----
  listUserDepositAddresses: (params?: Record<string, any>) =>
    request<{ items: any[]; total: number }>("/api/admin/deposit-addresses" + buildQuery(params)),

  // ---- 公链管理 ----
  listChains: (params?: Record<string, any>) =>
    request<{ items: any[]; total: number }>("/api/admin/chains" + buildQuery(params)),
  createChain: (c: any) => request("/api/admin/chains", { method: "POST", body: JSON.stringify(c) }),
  updateChain: (id: number, patch: any) =>
    request(`/api/admin/chains/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

  // ---- 币种管理 ----
  listCoins: (params?: Record<string, any>) =>
    request<{ items: any[]; total: number }>("/api/admin/coins" + buildQuery(params)),
  createCoin: (c: any) => request("/api/admin/coins", { method: "POST", body: JSON.stringify(c) }),
  updateCoin: (id: number, patch: any) =>
    request(`/api/admin/coins/${id}`, { method: "PUT", body: JSON.stringify(patch) }),

  // ---- 公告管理（复用 cmd/user 的公告 Handler，前缀 /api/admin/announcements） ----
  listAnnouncements: (params?: Record<string, any>) =>
    request<{ announcements: any[]; total: number }>("/api/admin/announcements" + buildQuery(params)),
  createAnnouncement: (a: any) =>
    request("/api/admin/announcements", { method: "POST", body: JSON.stringify(a) }),
  updateAnnouncement: (id: number, patch: any) =>
    request(`/api/admin/announcements/${id}`, { method: "PUT", body: JSON.stringify(patch) }),
  deleteAnnouncement: (id: number) =>
    request(`/api/admin/announcements/${id}`, { method: "DELETE" }),

  // ---- 订单管理（跨用户查询/撤销，运营风控；需 trade:read / trade:manage） ----
  listOrders: (params?: Record<string, any>) =>
    request<{ orders: any[]; total: number }>("/api/admin/orders" + buildQuery(params)),
  getOrder: (id: number) => request<any>(`/api/admin/orders/${id}`),
  cancelOrder: (id: number, symbol: string) =>
    request<any>("/api/admin/orders/" + id + "/cancel", {
      method: "POST",
      body: JSON.stringify({ symbol }),
    }),
  listTrades: (params?: Record<string, any>) =>
    request<{ trades: any[]; total: number }>("/api/admin/trades" + buildQuery(params)),

  // ---- 审计日志（需 audit:read） ----
  listAuditLogs: (params?: Record<string, any>) =>
    request<{ logs: any[]; total: number }>("/api/admin/audit-logs" + buildQuery(params)),

  // ---- 当前管理员自身 ----
  me: () => request<any>("/api/admin/me"),

  // ---- 当前管理员自身偏好（语言/主题/时区，跨设备持久化，localStorage 为兜底缓存） ----
  getPreferences: () =>
    request<{ admin_id: number; language: string; theme: string; timezone: string }>(
      "/api/admin/preferences",
    ),
  updatePreferences: (p: { language: string; theme: string; timezone: string }) =>
    request("/api/admin/preferences", { method: "PUT", body: JSON.stringify(p) }),
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
  listAdmins: (params?: Record<string, any>) =>
    request<{ items: any[]; total: number }>("/api/admin/admins" + buildQuery(params)),
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
  listRoles: (params?: Record<string, any>) =>
    request<{ items: any[]; total: number }>("/api/admin/roles" + buildQuery(params)),
  createRole: (r: any) =>
    request("/api/admin/roles", { method: "POST", body: JSON.stringify(r) }),
  updateRole: (id: number, patch: { name: string; description?: string }) =>
    request(`/api/admin/roles/${id}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),
  setRolePermissions: (id: number, permissions: string[]) =>
    request(`/api/admin/roles/${id}/permissions`, {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    }),
  deleteRole: (id: number) => request(`/api/admin/roles/${id}`, { method: "DELETE" }),
  listPermissions: () => request<any[]>("/api/admin/permissions"),

  // ---- API Key 管理（读需 apikey:read，签发/吊销需 apikey:manage） ----
  listApiKeys: (params?: Record<string, any>) =>
    request<{ items: any[]; total: number }>("/api/admin/apikeys" + buildQuery(params)),
  getApiKey: (id: number) => request<any>("/api/admin/apikeys/" + id),
  createApiKey: (body: { user_id: number; label: string; permissions?: string[] }) =>
    request<{ key: string; api_key: any }>("/api/admin/apikeys", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  revokeApiKey: (id: number) =>
    request<{ revoked: boolean; id: number }>("/api/admin/apikeys/" + id, {
      method: "DELETE",
    }),

  // ---- 借贷管理（代理 lending 服务） ----
  listLendingPools: () =>
    request<{ pools: any[] }>("/api/admin/lending/pools"),
  createLendingPool: (asset: string, collateralReq: number) =>
    request<{ pool: any }>("/api/admin/lending/pools", {
      method: "POST",
      body: JSON.stringify({ asset, collateral_req: collateralReq }),
    }),
  listLendingLends: () =>
    request<{ lends: any[] }>("/api/admin/lending/lends"),
  listLendingBorrows: () =>
    request<{ borrows: any[] }>("/api/admin/lending/borrows"),

  // ---- 理财管理（代理 wealth 服务） ----
  listWealthProducts: () =>
    request<{ products: any[] }>("/api/admin/wealth/products"),
  createWealthProduct: (data: Record<string, any>) =>
    request<{ product: any }>("/api/admin/wealth/products", { method: "POST", body: JSON.stringify(data) }),
  listWealthHoldings: () =>
    request<{ holdings: any[] }>("/api/admin/wealth/holdings"),
  accrueWealth: () =>
    request<{ accrued: number }>("/api/admin/wealth/holdings/accrue", { method: "POST" }),

  // ---- 交易机器人管理（代理 bot 服务） ----
  listBotStrategies: () =>
    request<{ strategies: any[] }>("/api/admin/bot/strategies"),
  botTick: (id: number | string) =>
    request<any>("/api/admin/bot/strategies/" + id + "/tick", { method: "POST", body: "{}" }),

  // ---- 邀请佣金管理 ----
  getReferralCommissions: (params?: { limit?: number; offset?: number }) =>
    request<{ commissions: Commission[]; total: number }>("/api/admin/referral/commissions" + buildQuery(params)),

  // ---- KYC 审核 ----
  listKycReviews: (params?: Record<string, any>) =>
    request<{ items: any[]; total: number }>("/api/admin/kyc-reviews" + buildQuery(params)),
  getKycDetail: (id: number) => request<any>(`/api/admin/kyc-reviews/${id}`),
  approveKyc: (id: number) => request(`/api/admin/kyc-reviews/${id}/approve`, { method: "POST" }),
  rejectKyc: (id: number, reason: string) =>
    request(`/api/admin/kyc-reviews/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),

  // ---- 大额提现人工审核 ----
  listPendingWithdrawals: (params?: Record<string, any>) =>
    request<{ items: any[]; total: number }>("/api/admin/pending-withdrawals" + buildQuery(params)),
  getWithdrawalDetail: (id: number) => request<any>(`/api/admin/withdrawals/${id}/detail`),
  approveWithdrawalManual: (id: number) =>
    request(`/api/admin/withdrawals/${id}/approve`, { method: "POST" }),
  rejectWithdrawalManual: (id: number, reason: string) =>
    request(`/api/admin/withdrawals/${id}/reject`, { method: "POST", body: JSON.stringify({ reason }) }),
};
