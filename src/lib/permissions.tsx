import { type ReactNode } from "react";
import { useAuth } from "./auth";
import { Alert } from "../components/ui/alert";

// ─── 权限定义 ────────────────────────────────────────────────────────────────
// 每个权限字符串对应一个操作级别，建议格式：resource:action
export const PERMISSIONS = {
  // 只读类
  "risk:view": "风控大盘查看",
  "user:view": "用户列表查看",
  "user:write": "用户写入（创建/冻结/解冻）",
  "trade:view": "交易数据查看（订单/成交流水）",
  "trade:manage": "交易管理（撤销订单）",
  "audit:view": "审计日志查看",
  "apikey:view": "API Key 查看",
  "apikey:manage": "API Key 管理（签发/吊销）",
  "finance:view": "资金/财务查看（充值提币）",
  "finance:approve": "资金审批（提币审核）",
  "c2c:view": "C2C 交易查看",
  "c2c:manage": "C2C 交易管理（冻结订单）",
  // 管理/配置类
  "admin:manage": "管理员管理",
  "role:manage": "角色与权限管理",
  "system:config": "系统配置（交易对/币种/公链）",
  "sys:settings": "安全设置",
  "ops:view": "运营看板",
  // 期货交易管理
  "futures:view": "期货持仓/资金费查看",
  "futures:manage": "期货交易管理（充值/代客直提/应急冻结/风控开关/坏账分摊）",
  // 其他
  "notification:write": "发布运营通知",
  "announcement:write": "发布公告",
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

// ─── 角色 → 权限映射（默认模板）───────────────────────────────────────────────
export const ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  super_admin: Object.keys(PERMISSIONS) as PermissionKey[],
  compliance_officer: [
    "risk:view",
    "user:view",
    "user:write",
    "trade:view",
    "audit:view",
    "finance:view",
    "finance:approve",
    "c2c:view",
  ],
  customer_support: [
    "user:view",
    "trade:view",
    "audit:view",
    "finance:view",
    "c2c:view",
  ],
  operator: [
    "ops:view",
    "risk:view",
    "futures:view",
    "user:view",
    "trade:view",
    "notification:write",
    "announcement:write",
  ],
};

// ─── 菜单项权限约束 ──────────────────────────────────────────────────────────
export interface MenuItem {
  path?: string;
  label: string;
  icon?: string;
  perm?: PermissionKey;
  permAny?: PermissionKey[];
  children?: MenuItem[];
  group?: string;
}

// ─── PermissionGuard ─────────────────────────────────────────────────────────
// 包装子组件：无权限时隐藏整个区块（return null）。
// 也可通过 fallback 提供降级 UI。
export function PermissionGuard({
  children,
  need,
  anyOf,
  fallback,
  className,
}: {
  children: ReactNode;
  need?: PermissionKey | PermissionKey[];
  anyOf?: PermissionKey | PermissionKey[];
  fallback?: ReactNode;
  className?: string;
}) {
  const { perms } = useAuth();
  const has = (keys: PermissionKey[]) => keys.some((k) => perms.includes(k));

  const ok =
    (!need || has(Array.isArray(need) ? need : [need])) &&
    (!anyOf || has(Array.isArray(anyOf) ? anyOf : [anyOf]));

  if (!ok) {
    if (fallback !== undefined) return <>{fallback}</>;
    return null;
  }
  return <div className={className}>{children}</div>;
}

// ─── PermissionButton ────────────────────────────────────────────────────────
// 按钮级权限：无权限时渲染 disabled 占位按钮（保留布局），有权限则透传。
export function PermissionButton({
  children,
  need,
  anyOf,
  disabledText,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  need?: PermissionKey | PermissionKey[];
  anyOf?: PermissionKey | PermissionKey[];
  disabledText?: string;
}) {
  const { perms } = useAuth();
  const has = (keys: PermissionKey[]) => keys.some((k) => perms.includes(k));
  const allowed =
    (!need || has(Array.isArray(need) ? need : [need])) &&
    (!anyOf || has(Array.isArray(anyOf) ? anyOf : [anyOf]));

  if (!allowed) {
    return (
      <button
        type="button"
        disabled
        className={`inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors
          cursor-not-allowed opacity-40 border border-border bg-transparent px-2.5 py-1.5 ${className ?? ""}`}
        title={disabledText ?? "无权限"}
        {...props}
      >
        {disabledText ?? "—"}
      </button>
    );
  }
  return (
    <button type="button" {...props} className={className}>
      {children}
    </button>
  );
}

// ─── 页面级权限守卫：无权限时展示提示 ─────────────────────────────────────────
export function PermPage({
  children,
  need,
  anyOf,
  title,
  permHint,
}: {
  children: ReactNode;
  need?: PermissionKey | PermissionKey[];
  anyOf?: PermissionKey | PermissionKey[];
  title?: string;
  permHint?: string;
}) {
  const { perms } = useAuth();
  const has = (keys: PermissionKey[]) => keys.some((k) => perms.includes(k));
  const ok =
    (!need || has(Array.isArray(need) ? need : [need])) &&
    (!anyOf || has(Array.isArray(anyOf) ? anyOf : [anyOf]));

  if (!ok) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">{title ?? "无权限"}</h1>
        <Alert variant="error">{permHint ?? "您没有访问此页面的权限"}</Alert>
      </div>
    );
  }
  return <>{children}</>;
}
