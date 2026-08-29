import { useGlobalStore } from "../store/useGlobalStore";

// ─── 防旁观模式：敏感信息打码工具 ─────────────────────────────────────────────

const STARS = "****";

export function maskEmail(v?: string): string {
  if (v == null || v === "") return "-";
  const at = v.indexOf("@");
  if (at <= 1) return v;
  return `${v.slice(0, at).slice(0, 3)}${STARS}${v.slice(at)}`;
}

export function maskPhone(v?: string): string {
  if (v == null || v === "") return "-";
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7) return `${v.slice(0, 2)}${STARS}`;
  return `${v.slice(0, 3)}${STARS}${v.slice(-4)}`;
}

export function maskHash(v?: string): string {
  if (v == null || v === "") return "-";
  return `${v.slice(0, 4)}${STARS}${v.slice(-4)}`;
}

export function maskIp(v?: string): string {
  if (v == null || v === "") return "-";
  return `${v.slice(0, 6)}${STARS}`;
}

export function maskBalance(): string {
  return `${STARS}${STARS}${STARS}`;
}

export type MaskFn = (v?: string) => string;

// ─── 响应式组件：仅当防旁观模式开启时打码（订阅全局状态，实时生效） ───────────────

export function MaskedText({ value, mask }: { value?: any; mask: MaskFn | "balance" }) {
  const privacy = useGlobalStore((s: { privacyMode: boolean }) => s.privacyMode);
  if (!privacy) {
    if (value == null || value === "") return <>{String(value ?? "-")}</>;
    return <>{String(value)}</>;
  }
  if (mask === "balance") return <>{maskBalance()}</>;
  return <>{mask(String(value ?? ""))}</>;
}

// 用于普通 JSX 文本返回
export function useMasked(): boolean {
  return useGlobalStore((s: { privacyMode: boolean }) => s.privacyMode);
}
