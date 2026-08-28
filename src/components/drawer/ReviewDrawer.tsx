import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import { formatDateTime } from "../../lib/timezone";
import { api } from "../../api/client";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { StatusBadge } from "../ui/status-badge";
import { Input } from "../ui/input";
import { Alert } from "../ui/alert";
import {
  X,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Fingerprint,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Keyboard,
  Eye,
} from "lucide-react";

// ─── 类型定义 ──────────────────────────────────────────────────────────────────
export type ReviewType = "kyc" | "withdrawal";

export interface ReviewItem {
  id: number;
  user_id: number;
  submitted_at: string;
  // KYC 字段
  type?: "kyc";
  kyc_level?: string;
  full_name?: string;
  id_number?: string;
  country?: string;
  expiry_date?: string;
  selfie_url?: string;
  id_card_front_url?: string;
  // Withdrawal 字段
  type2?: "withdrawal";
  coin?: string;
  amount?: number;
  address?: string;
  chain?: string;
  tx_hash?: string;
  status?: string;
}

export interface KycDetail extends ReviewItem {
  type: "kyc";
  ocr_full_name?: string;
  ocr_id_number?: string;
  ocr_country?: string;
  ocr_expiry_date?: string;
  face_score?: number; // 0-100
  id_card_back_url?: string;
}

export interface WithdrawalDetail extends ReviewItem {
  type2: "withdrawal";
  user_24h_deposit?: number;
  user_24h_withdrawal?: number;
  user_24h_pnl?: number;
  aml_tags?: string[];
  user_total_deposits?: number;
  user_total_withdrawals?: number;
  transaction_count?: number;
  first_deposit_at?: string;
  last_login_ip?: string;
  device_fingerprint?: string;
}

type ReviewDetail = KycDetail | WithdrawalDetail;

// ─── 拒绝原因选项 ──────────────────────────────────────────────────────────────
const REJECT_REASONS_KYC = [
  "证件照片模糊/不完整",
  "人脸与证件照不符",
  "证件已过期",
  "信息填写与证件不一致",
  "疑似代持/非本人操作",
  "其他",
];

const REJECT_REASONS_WD = [
  "提币地址未在白名单",
  "大额提现触发风控规则",
  "账户状态异常（冻结/限制）",
  "AML 风险标签命中",
  "用户KYC未通过",
  "其他",
];

// ─── 模拟数据生成器 ────────────────────────────────────────────────────────────
function mockKycDetail(id: number): KycDetail {
  const name = ["Zhang San", "Li Si", "Wang Wu", "Chen Liu"][Math.floor(Math.random() * 4)];
  const mismatch = Math.random() < 0.3;
  return {
    id,
    user_id: 1000 + id,
    submitted_at: new Date(Date.now() - Math.random() * 86400000 * 3).toISOString(),
    type: "kyc",
    kyc_level: "KYC2",
    full_name: name,
    id_number: `110${String(id).padStart(10, "0")}`,
    country: ["CN", "US", "SG", "HK"][Math.floor(Math.random() * 4)],
    expiry_date: "2028-12-31",
    selfie_url: `https://picsum.photos/seed/kyc-selfie-${id}/200/260`,
    id_card_front_url: `https://picsum.photos/seed/kyc-id-${id}/300/190`,
    id_card_back_url: `https://picsum.photos/seed/kyc-idback-${id}/300/190`,
    ocr_full_name: mismatch ? "Zhang Si" : name,
    ocr_id_number: mismatch ? `110${String(id).padStart(10, "0")}` : `110${String(id).padStart(10, "0")}`,
    ocr_country: mismatch ? "US" : "CN",
    ocr_expiry_date: "2028-12-31",
    face_score: mismatch ? Math.floor(Math.random() * 40 + 30) : Math.floor(Math.random() * 15 + 80),
  };
}

function mockWithdrawalDetail(id: number): WithdrawalDetail {
  const amount = parseFloat((Math.random() * 200000 + 50000).toFixed(2));
  const totalDep = parseFloat((Math.random() * 500000 + 100000).toFixed(2));
  return {
    id,
    user_id: 2000 + id,
    submitted_at: new Date(Date.now() - Math.random() * 3600000 * 6).toISOString(),
    type2: "withdrawal",
    coin: "USDT",
    amount,
    address: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
    chain: "TRC20",
    tx_hash: undefined,
    status: "pending",
    user_24h_deposit: parseFloat((Math.random() * 100000).toFixed(2)),
    user_24h_withdrawal: amount,
    user_24h_pnl: parseFloat((Math.random() * 40000 - 10000).toFixed(2)),
    aml_tags: Math.random() < 0.3
      ? ["tornado_cash", "mixer"]
      : Math.random() < 0.5
        ? ["high_risk_jurisdiction"]
        : [],
    user_total_deposits: totalDep,
    user_total_withdrawals: parseFloat((totalDep * (0.3 + Math.random() * 0.5)).toFixed(2)),
    transaction_count: Math.floor(Math.random() * 500 + 50),
    first_deposit_at: new Date(Date.now() - Math.random() * 86400000 * 365).toISOString(),
    last_login_ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
    device_fingerprint: `fp_${String(id).padStart(6, "0")}`,
  };
}

// ─── 拒绝原因选择弹窗 ──────────────────────────────────────────────────────────
function RejectModal({
  open,
  reasons,
  onClose,
  onConfirm,
}: {
  open: boolean;
  reasons: string[];
  onClose: () => void;
  onConfirm: (reason: string) => void;
}) {
  const { t } = useI18n();
  const [selected, setSelected] = useState("");
  const [custom, setCustom] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setSelected("");
      setCustom("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-4 space-y-3 m-4">
        <h2 className="text-sm font-semibold">{t("reviewdrawer.rejectTitle")}</h2>
        <div className="space-y-1.5">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => { setSelected(r); setCustom(""); }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-md text-xs transition-colors",
                selected === r
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <Input
          ref={inputRef}
          value={custom}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSelected(""); setCustom(e.target.value); }}
          placeholder={t("reviewdrawer.rejectCustomPh")}
          className="h-7 text-xs"
        />
        <div className="flex items-center gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            className="flex-1 h-7 text-xs bg-destructive hover:bg-destructive/90"
            disabled={!selected && !custom.trim()}
            onClick={() => onConfirm(selected || custom)}
          >
            {t("reviewdrawer.confirmReject")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── 主抽屉 ────────────────────────────────────────────────────────────────────
interface ReviewDrawerProps {
  type: ReviewType;
  item: ReviewItem | null;
  allItems: ReviewItem[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (idx: number) => void;
  onApprove: (id: number) => void;
  onReject: (id: number, reason: string) => void;
  toast: (msg: string) => void;
}

export function ReviewDrawer({
  type,
  item,
  allItems,
  currentIndex,
  onClose,
  onNavigate,
  onApprove,
  onReject,
  toast,
}: ReviewDrawerProps) {
  const { t } = useI18n();
  const [detail, setDetail] = useState<ReviewDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [pendingRejectId, setPendingRejectId] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const reasons = type === "kyc" ? REJECT_REASONS_KYC : REJECT_REASONS_WD;

  // 加载详情
  useEffect(() => {
    if (!item) return;
    setLoading(true);
    setError(null);
    setDetail(null);
    const fn = type === "kyc" ? api.getKycDetail : api.getWithdrawalDetail;
    fn(item.id)
      .then((d) => setDetail(d ?? (type === "kyc" ? mockKycDetail(item.id) : mockWithdrawalDetail(item.id))))
      .catch(() => setDetail(type === "kyc" ? mockKycDetail(item.id) : mockWithdrawalDetail(item.id)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, type]);

  // 键盘快捷键
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!item) return;
      // Esc 关闭
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      // 拒绝原因弹窗
      if ((e.altKey && e.key.toLowerCase() === "n") || e.key.toLowerCase() === "r") {
        if (!e.altKey || e.key.toLowerCase() === "r") {
          e.preventDefault();
          setPendingRejectId(item.id);
          setRejectOpen(true);
          return;
        }
      }
      // 通过
      if ((e.altKey && e.key.toLowerCase() === "y") || e.key.toLowerCase() === "a") {
        if (!e.altKey || e.key.toLowerCase() === "a") {
          e.preventDefault();
          handleApprove();
          return;
        }
      }
      // 上一条 / 下一条
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        if (currentIndex < allItems.length - 1) onNavigate(currentIndex + 1);
        return;
      }
      if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        if (currentIndex > 0) onNavigate(currentIndex - 1);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item, currentIndex, allItems.length, onClose, onNavigate]);

  // 滚动到顶部
  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = 0;
  }, [item?.id]);

  const handleApprove = async () => {
    if (!item) return;
    try {
      await onApprove(item.id);
      toast(t("reviewdrawer.approved"));
      if (currentIndex < allItems.length - 1) onNavigate(currentIndex + 1);
      else onClose();
    } catch (e: any) {
      toast(e?.message ?? t("common.opFailed"));
    }
  };

  const handleReject = async (reason: string) => {
    if (!item) return;
    try {
      await onReject(item.id, reason);
      toast(t("reviewdrawer.rejected"));
      if (currentIndex < allItems.length - 1) onNavigate(currentIndex + 1);
      else onClose();
    } catch (e: any) {
      toast(e?.message ?? t("common.opFailed"));
    }
  };

  if (!item) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < allItems.length - 1;

  // ─── KYC 对比视图 ────────────────────────────────────────────────────────────
  const renderKycView = () => {
    const d = detail as KycDetail | null;
    if (!d) return null;
    const mismatches: string[] = [];
    if (d.full_name !== d.ocr_full_name) mismatches.push("full_name");
    if (d.id_number !== d.ocr_id_number) mismatches.push("id_number");
    if (d.country !== d.ocr_country) mismatches.push("country");
    const faceScore = d.face_score ?? 0;
    const faceOk = faceScore >= 75;

    return (
      <div className="space-y-4">
        {/* 头部信息 */}
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">{t("reviewdrawer.kycLevel")}: {d.kyc_level ?? "KYC2"}</Badge>
          <span className="text-xs text-muted-foreground">{t("col.time")}: {formatDateTime(d.submitted_at)}</span>
        </div>

        {/* 左右对比 */}
        <div className="grid grid-cols-2 gap-3">
          {/* 左侧：用户填写 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reviewdrawer.userInput")}</p>
            <FieldRow
              label={t("reviewdrawer.fullName")}
              value={d.full_name}
              mismatch={mismatches.includes("full_name")}
            />
            <FieldRow
              label={t("reviewdrawer.idNumber")}
              value={d.id_number}
              mismatch={mismatches.includes("id_number")}
            />
            <FieldRow
              label={t("col.chain")}
              value={d.country}
              mismatch={mismatches.includes("country")}
            />
            <FieldRow
              label={t("reviewdrawer.expiryDate")}
              value={d.expiry_date}
            />
          </div>

          {/* 右侧：OCR 识别 */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t("reviewdrawer.ocrResult")}</p>
            <FieldRow
              label={t("reviewdrawer.fullName")}
              value={d.ocr_full_name}
              mismatch={mismatches.includes("full_name")}
            />
            <FieldRow
              label={t("reviewdrawer.idNumber")}
              value={d.ocr_id_number}
              mismatch={mismatches.includes("id_number")}
            />
            <FieldRow
              label={t("col.chain")}
              value={d.ocr_country}
              mismatch={mismatches.includes("country")}
            />
            <FieldRow
              label={t("reviewdrawer.expiryDate")}
              value={d.ocr_expiry_date}
            />
          </div>
        </div>

        {/* 图片区域 */}
        <div className="grid grid-cols-2 gap-3">
          <ImageView src={d.id_card_front_url} label={t("reviewdrawer.idCardFront")} />
          <ImageView src={d.selfie_url} label={t("reviewdrawer.selfie")} />
        </div>
        {d.id_card_back_url && (
          <ImageView src={d.id_card_back_url} label={t("reviewdrawer.idCardBack")} />
        )}

        {/* 人脸比对得分 */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Fingerprint className="h-3.5 w-3.5" />
              {t("reviewdrawer.faceMatch")}
            </span>
            <span className={cn("text-sm font-bold num", faceOk ? "text-success" : "text-destructive")}>
              {faceScore}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-muted">
            <div
              className={cn("h-2 rounded-full transition-all", faceOk ? "bg-success" : "bg-destructive")}
              style={{ width: `${faceScore}%` }}
            />
          </div>
          <p className={cn("text-[11px]", faceOk ? "text-success" : "text-destructive")}>
            {faceOk ? t("reviewdrawer.faceMatchOk") : t("reviewdrawer.faceMatchFail")}
          </p>
        </div>

        {/* 差异高亮 */}
        {mismatches.length > 0 && (
          <Alert variant="error" className="text-xs">
            <ShieldAlert className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            {t("reviewdrawer.mismatchFields", { n: mismatches.length })}
          </Alert>
        )}
      </div>
    );
  };

  // ─── 提现对比视图 ────────────────────────────────────────────────────────────
  const renderWithdrawalView = () => {
    const d = detail as WithdrawalDetail | null;
    if (!d) return null;
    const dep = d.user_24h_deposit ?? 0;
    const wd = d.user_24h_withdrawal ?? 0;
    const ratio = dep > 0 ? (wd / dep * 100).toFixed(1) : "—";
    const ratioNum = parseFloat(ratio);
    const ratioOk = ratioNum < 80;

    return (
      <div className="space-y-4">
        {/* 提现基本信息 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow label={t("col.coin")} value={d.coin ?? "-"} />
          <InfoRow label={t("col.amount")} value={`$${d.amount?.toLocaleString() ?? "-"}`} highlight />
          <InfoRow label={t("col.chain")} value={d.chain ?? "-"} />
          <InfoRow label={t("col.withdrawAddr")} value={d.address ?? "-"} mono />
          <InfoRow label={t("col.time")} value={formatDateTime(d.submitted_at)} />
          {d.tx_hash && <InfoRow label={t("col.txHash")} value={d.tx_hash} mono />}
        </div>

        {/* 用户 24h 行为 */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {t("reviewdrawer.withdrawUser24h")}
          </p>
          <div className="grid grid-cols-3 gap-2 text-xs">
            <StatBox
              label={t("reviewdrawer.deposit24h")}
              value={`$${d.user_24h_deposit?.toLocaleString() ?? "-"}`}
              tone="success"
            />
            <StatBox
              label={t("reviewdrawer.withdrawal24h")}
              value={`$${d.user_24h_withdrawal?.toLocaleString() ?? "-"}`}
              tone="destructive"
            />
            <StatBox
              label={t("reviewdrawer.pnl24h")}
              value={`$${d.user_24h_pnl?.toLocaleString() ?? "-"}`}
              tone={d.user_24h_pnl! >= 0 ? "success" : "destructive"}
            />
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{t("reviewdrawer.withdrawRatio")}</span>
            <span className={cn("font-semibold num", ratioOk ? "text-success" : "text-warning")}>
              {ratio}%
            </span>
          </div>
        </div>

        {/* AML 风险标签 */}
        <div className="rounded-lg border border-border bg-card p-3 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("reviewdrawer.amlLabels")}
          </p>
          {d.aml_tags && d.aml_tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {d.aml_tags.map((tag) => (
                <Badge key={tag} variant="destructive" className="text-[10px] px-2 py-0.5">
                  <AlertTriangle className="h-2.5 w-2.5 mr-1" />
                  {tag.replace(/_/g, " ")}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-xs text-success">{t("reviewdrawer.amlClean")}</p>
          )}
        </div>

        {/* 用户画像 */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow label={t("reviewdrawer.totalDeposit")} value={`$${d.user_total_deposits?.toLocaleString() ?? "-"}`} />
          <InfoRow label={t("reviewdrawer.totalWithdrawal")} value={`$${d.user_total_withdrawals?.toLocaleString() ?? "-"}`} />
          <InfoRow label={t("reviewdrawer.txCount")} value={String(d.transaction_count ?? "-")} />
          <InfoRow label={t("reviewdrawer.firstDeposit")} value={formatDateTime(d.first_deposit_at)} />
          <InfoRow label="IP" value={d.last_login_ip ?? "-"} mono />
          <InfoRow label={t("reviewdrawer.deviceFp")} value={d.device_fingerprint ?? "-"} mono />
        </div>
      </div>
    );
  };

  const handleRejectClick = () => {
    setPendingRejectId(item.id);
    setRejectOpen(true);
  };

  return (
    <>
      {/* 遮罩 */}
      <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* 抽屉主体 */}
      <div
        ref={containerRef}
        className="fixed top-0 right-0 z-50 h-full w-[60vw] max-w-[860px] bg-[hsl(var(--background))] border-l border-border shadow-2xl flex flex-col overflow-hidden"
        style={{ animation: "slideIn 0.2s ease-out" }}
      >
        <style>{`
          @keyframes slideIn {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
        `}</style>

        {/* ─── 顶部栏 ─── */}
        <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5 bg-[hsl(var(--card))]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold truncate">
              {type === "kyc" ? t("reviewdrawer.kycTitle") : t("reviewdrawer.withdrawTitle")}
            </span>
            <Badge variant="secondary" className="text-[10px]">
              #{item.id} · UID {item.user_id}
            </Badge>
            {type === "kyc" && (
              <StatusBadge tone="warning">{t("reviewdrawer.pending")}</StatusBadge>
            )}
            {type === "withdrawal" && (
              <StatusBadge tone="warning">{t("reviewdrawer.pendingApproval")}</StatusBadge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* ─── 主体内容区 ─── */}
        <div className="flex flex-1 min-h-0">
          {/* 左侧：对比详情 */}
          <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
              </div>
            ) : error ? (
              <Alert variant="error" className="text-xs">{error}</Alert>
            ) : type === "kyc" ? renderKycView() : renderWithdrawalView()}
          </div>

          {/* 右侧：操作面板 */}
          <div className="w-52 shrink-0 border-l border-border bg-[hsl(var(--card))] p-3 flex flex-col gap-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1">
              {t("reviewdrawer.actions")}
            </p>
            <Button
              variant="default"
              size="sm"
              className="w-full h-8 text-xs bg-success hover:bg-success/90 text-success-foreground"
              onClick={handleApprove}
            >
              <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
              {t("reviewdrawer.approve")}
              <kbd className="ml-auto text-[9px] opacity-60">A</kbd>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs text-destructive border-destructive/40 hover:bg-destructive/10"
              onClick={handleRejectClick}
            >
              <XCircle className="h-3.5 w-3.5 mr-1.5" />
              {t("reviewdrawer.reject")}
              <kbd className="ml-auto text-[9px] opacity-60">R</kbd>
            </Button>

            <div className="mt-2 border-t border-border pt-2 space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider pb-1">
                {t("reviewdrawer.navigate")}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                disabled={!hasPrev}
                onClick={() => onNavigate(currentIndex - 1)}
              >
                <ChevronLeft className="h-3 w-3 mr-1" />
                {t("common.prev")}
                <kbd className="ml-auto text-[9px] opacity-50">K</kbd>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                disabled={!hasNext}
                onClick={() => onNavigate(currentIndex + 1)}
              >
                {t("common.next")}
                <kbd className="ml-auto text-[9px] opacity-50">J</kbd>
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </div>

            {/* 进度指示 */}
            <div className="mt-auto pt-2 border-t border-border">
              <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                <span>{t("reviewdrawer.progress")}</span>
                <span className="num">{currentIndex + 1} / {allItems.length}</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${((currentIndex + 1) / allItems.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ─── 底部快捷键提示栏 ─── */}
        <div className="shrink-0 border-t border-border bg-[hsl(var(--card))] px-4 py-2 flex items-center gap-3 flex-wrap">
          <Keyboard className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <KeyHint label={t("reviewdrawer.shortcutApprove")} keys={["A", "⌘Y"]} />
          <KeyHint label={t("reviewdrawer.shortcutReject")} keys={["R", "⌘N"]} />
          <KeyHint label={t("reviewdrawer.shortcutPrev")} keys={["K", "↑"]} />
          <KeyHint label={t("reviewdrawer.shortcutNext")} keys={["J", "↓"]} />
          <KeyHint label={t("reviewdrawer.shortcutClose")} keys={["Esc"]} />
          <div className="ml-auto text-[10px] text-muted-foreground">
            {t("reviewdrawer.powerUserTip")}
          </div>
        </div>
      </div>

      {/* 拒绝弹窗 */}
      <RejectModal
        open={rejectOpen}
        reasons={reasons}
        onClose={() => setRejectOpen(false)}
        onConfirm={(reason) => {
          setRejectOpen(false);
          if (pendingRejectId !== null) handleReject(reason);
        }}
      />
    </>
  );
}

// ─── 辅助组件 ──────────────────────────────────────────────────────────────────
function FieldRow({
  label,
  value,
  mismatch,
}: {
  label: string;
  value?: string;
  mismatch?: boolean;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs",
      mismatch ? "bg-destructive/10 text-destructive border border-destructive/30" : "bg-background text-foreground",
    )}>
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("num font-medium truncate max-w-[140px]", mismatch && "font-bold")}>{value ?? "—"}</span>
    </div>
  );
}

function ImageView({ src, label }: { src?: string; label: string }) {
  if (!src) return null;
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="relative rounded-md border border-border overflow-hidden bg-background aspect-[3/2] flex items-center justify-center">
        <img src={src} alt={label} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute bottom-1.5 left-2 flex items-center gap-1">
          <Eye className="h-3 w-3 text-white/80" />
          <span className="text-[10px] text-white/80">{label}</span>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
  highlight,
}: {
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-md px-2.5 py-1.5 text-xs bg-background">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("font-medium num truncate max-w-[160px]", highlight && "text-warning font-bold", mono && "font-mono text-[11px]")}>
        {value}
      </span>
    </div>
  );
}

function StatBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "destructive" | "warning" | "neutral";
}) {
  const toneColor = {
    success: "text-success",
    destructive: "text-destructive",
    warning: "text-warning",
    neutral: "text-foreground",
  }[tone];
  return (
    <div className="rounded-md bg-background px-2.5 py-1.5 text-center">
      <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
      <p className={cn("text-sm font-bold num", toneColor)}>{value}</p>
    </div>
  );
}

function KeyHint({ label, keys }: { label: string; keys: string[] }) {
  return (
    <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
      <span>{label}</span>
      <span className="flex items-center gap-0.5">
        {keys.map((k) => (
          <kbd key={k} className="inline-flex h-4 min-w-4 items-center justify-center rounded border border-border bg-background px-1 text-[9px] font-mono text-muted-foreground">
            {k}
          </kbd>
        ))}
      </span>
    </span>
  );
}
