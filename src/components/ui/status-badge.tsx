import * as React from "react";
import { cn } from "../../lib/utils";

// 统一状态标识：柔和浅底 + 深色高亮文字 + 左侧圆点。
// success 涨/充值/通过 · danger 跌/提现/拒绝 · warning 预警/待审核
// neutral 冻结/禁用 · info 链上处理中
export type StatusTone =
  | "success"
  | "danger"
  | "warning"
  | "neutral"
  | "info";

const toneBadge: Record<StatusTone, string> = {
  success: "bg-success/10 text-success",
  danger: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  neutral: "bg-neutral/10 text-neutral",
  info: "bg-info/10 text-info",
};

const toneDot: Record<StatusTone, string> = {
  success: "bg-success",
  danger: "bg-destructive",
  warning: "bg-warning",
  neutral: "bg-neutral",
  info: "bg-info",
};

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: StatusTone;
  children: React.ReactNode;
}

export function StatusBadge({
  tone = "neutral",
  children,
  className,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        toneBadge[tone],
        className,
      )}
      {...props}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", toneDot[tone])} />
      {children}
    </span>
  );
}
