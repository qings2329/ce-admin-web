import { useEffect, useMemo, useRef, useState } from "react";
import { useFetch } from "../lib/useFetch";
import { api } from "../api/client";
import { useAuth } from "../lib/auth";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { cn } from "../lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Alert } from "../components/ui/alert";
import { StatusBadge } from "../components/ui/status-badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
import {
  ArrowDownUp,
  ShieldCheck,
  TrendingDown,
  FileSearch,
  RefreshCw,
  Plug,
  PlugZap,
  UserX,
  CheckCircle2,
  FileText,
  Search,
  X,
} from "lucide-react";
import { FundFlowChart } from "../components/charts/FundFlowChart";
import { LiquidationDistChart } from "../components/charts/LiquidationDistChart";
import { AlertStream } from "../components/stream/AlertStream";
import { TransactionDrillDown } from "../components/dialog/TransactionDrillDown";
import { MaskedText, maskIp } from "../lib/mask";

// ─── 类型别名（与 AlertStream / TransactionDrillDown 共享）─────────────────────
export type AlertLevel = "critical" | "warning" | "info";

export interface RiskAlert {
  id: string;
  level: AlertLevel;
  titleKey: string;
  descKey: string;
  message?: string;
  user_id?: number;
  amount?: number;
  coin?: string;
  ip?: string;
  country?: string;
  occurred_at: string;
  handled?: boolean;
}

// riskEventLevel 将真实风控事件 kind 映射为告警等级：提现/下单/持仓/频率类多半为异常命中。
function riskEventLevel(kind: string): AlertLevel {
  const k = (kind ?? "").toLowerCase();
  if (k.includes("withdraw") || k.includes("position")) return "critical";
  if (k.includes("order") || k.includes("freq") || k.includes("login") || k.includes("ip")) return "warning";
  return "info";
}

// riskEventToAlert 将后端真实风控事件转换为 AlertStream 条目。
// 真实事件仅含 {id,user_id,kind,detail,created_at}；不含金额/币种/IP 等伪字段。
function riskEventToAlert(e: any): RiskAlert {
  return {
    id: `evt-${e.id}`,
    level: riskEventLevel(e.kind),
    titleKey: "riskdash.evt.title",
    descKey: "riskdash.evt.desc",
    message: e.detail || e.kind || "",
    user_id: e.user_id || undefined,
    occurred_at: e.created_at ? new Date(e.created_at).toISOString() : new Date().toISOString(),
  };
}

// ─── 真实风控事件轮询 Hook（替代旧的 setInterval 伪告警）──────────────────────
// 以 5s 间隔拉取 /api/admin/risk/events，按事件 ID 高水位去重，仅把新增的真实
// 事件推入告警流；间隔超时/接口异常时保持连接态并记录重连次数，不伪造任何告警。
function useRiskEventsPolling(onEvent: (event: RiskAlert) => void) {
  const [connected, setConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastIdRef = useRef(0);

  const start = () => {
    setConnected(true);
    setReconnectCount(0);
    const poll = async () => {
      try {
        const resp: any = await api.getRiskEvents({ limit: 50 });
        const items: any[] = resp?.items ?? [];
        // 后端按时间倒序（最新在前）；仅下发 id 超过高水位的新事件
        const newest = items.filter((e) => Number(e?.id ?? 0) > lastIdRef.current);
        for (const e of newest) {
          lastIdRef.current = Math.max(lastIdRef.current, Number(e?.id ?? 0));
          onEvent(riskEventToAlert(e));
        }
      } catch {
        // 上游不可达不伪造；下次轮询自动重试
      }
    };
    void poll();
    intervalRef.current = setInterval(() => void poll(), 5000);
  };

  const stop = () => {
    setConnected(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
  };

  const reconnect = () => {
    stop();
    setReconnectCount((c) => c + 1);
    setTimeout(start, 1500);
  };

  useEffect(() => {
    start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { connected, reconnectCount, reconnect };
}

// ─── 核心指标卡片 ─────────────────────────────────────────────────────────────
function MetricCard({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  tone: "success" | "warning" | "destructive" | "info" | "neutral";
  icon: React.ReactNode;
}) {
  const toneColor = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    info: "text-info",
    neutral: "text-muted-foreground",
  }[tone];
  const toneBg = {
    success: "bg-success/10",
    warning: "bg-warning/10",
    destructive: "bg-destructive/10",
    info: "bg-info/10",
    neutral: "bg-neutral/10",
  }[tone];
  return (
    <Card className="border-l-2">
      <CardContent className="pt-3 pb-3 flex items-start gap-3">
        <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneBg)}>
          <span className={toneColor}>{icon}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className={cn("text-xl font-bold num leading-tight", toneColor)}>{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── 旧版告警卡片（保留用于中间列表）──────────────────────────────────────────
function LegacyAlertCard({
  alert,
  onFreeze,
  onHandle,
  onLogs,
}: {
  alert: RiskAlert;
  onFreeze: (uid: number) => void;
  onHandle: (id: string) => void;
  onLogs: (alert: RiskAlert) => void;
}) {
  const { t } = useI18n();
  const levelColors = {
    critical: "border-l-destructive bg-destructive/5",
    warning: "border-l-warning bg-warning/5",
    info: "border-l-info bg-info/5",
  };
  const levelBadgeTone = {
    critical: "danger" as const,
    warning: "warning" as const,
    info: "info" as const,
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 border-border bg-card p-3 flex flex-col gap-2",
        levelColors[alert.level],
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusBadge tone={levelBadgeTone[alert.level]}>
            {t(`riskdash.level.${alert.level}`)}
          </StatusBadge>
          <span className="text-xs text-muted-foreground num">
            {formatDateTime(alert.occurred_at)}
          </span>
        </div>
        {alert.handled && (
          <Badge variant="secondary" className="text-[10px]">
            {t("riskdash.handled")}
          </Badge>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold leading-snug">
          {alert.message ? alert.message : t(alert.titleKey)}
        </p>
        {!alert.message && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(alert.descKey)}</p>
        )}
      </div>
      {(alert.user_id || alert.amount) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground num">
          {alert.user_id && <span>{t("col.userId")}: <span className="text-foreground font-medium">{alert.user_id}</span></span>}
          {alert.amount && <span>{alert.coin ?? "USDT"}: <span className="text-foreground font-medium"><MaskedText value={alert.amount.toLocaleString()} mask="balance" /></span></span>}
          {alert.ip && <span>IP: <span className="text-foreground font-medium"><MaskedText value={alert.ip} mask={maskIp} /></span></span>}
          {alert.country && <span>{t("riskdash.region")}: <span className="text-foreground font-medium">{alert.country}</span></span>}
        </div>
      )}
      <div className="flex items-center gap-1.5 pt-1">
        {!alert.handled && alert.user_id && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-destructive hover:bg-destructive/10"
            onClick={() => onFreeze(alert.user_id!)}
          >
            <UserX className="h-3 w-3 mr-1" />
            {t("riskdash.freeze")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={() => onLogs(alert)}
        >
          <FileText className="h-3 w-3 mr-1" />
          {t("riskdash.viewLog")}
        </Button>
        {!alert.handled && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-success hover:bg-success/10 ml-auto"
            onClick={() => onHandle(alert.id)}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {t("riskdash.markHandled")}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── 上下文日志抽屉 ───────────────────────────────────────────────────────────
function LogDrawer({
  alert,
  onClose,
}: {
  alert: RiskAlert | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  if (!alert) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold">{t("riskdash.contextLog")}</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("col.userId")}</span>
              <span className="num font-medium">{alert.user_id ?? "-"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("riskdash.alertLevel")}</span>
              <StatusBadge tone={alert.level === "critical" ? "danger" : alert.level === "warning" ? "warning" : "info"}>
                {t(`riskdash.level.${alert.level}`)}
              </StatusBadge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("col.time")}</span>
              <span className="num">{formatDateTime(alert.occurred_at)}</span>
            </div>
            {alert.amount && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("col.amount")}</span>
                <span className="num font-semibold"><MaskedText value={alert.amount.toLocaleString()} mask="balance" /> {alert.coin ?? ""}</span>
              </div>
            )}
            {alert.ip && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">IP</span>
                <span className="num"><MaskedText value={alert.ip} mask={maskIp} /></span>
              </div>
            )}
            {alert.country && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("col.chain")}</span>
                <span>{alert.country}</span>
              </div>
            )}
          </div>
          <div className="rounded-md border border-border bg-background p-3">
            <p className="text-[11px] font-semibold text-muted-foreground mb-2">{t("riskdash.auditTrail")}</p>
            <div className="space-y-1.5 text-[11px] font-mono text-muted-foreground">
              <p>[{formatDateTime(alert.occurred_at)}] risk_engine.alert_emit level={alert.level}</p>
              <p>[{formatDateTime(alert.occurred_at)}] rule_triggered: [{t(alert.titleKey).replace(/"/g, '\\"')}]</p>
              {alert.amount && <p>[{formatDateTime(alert.occurred_at)}] amount={<MaskedText value={alert.amount} mask="balance" />} coin={alert.coin}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 主页面 ───────────────────────────────────────────────────────────────────
export function RiskDashboard() {
  const { t } = useI18n();
  const { perms } = useAuth();
  void perms;

  const { data, loading, error, reload } = useFetch(api.getRisk);
  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [logAlert, setLogAlert] = useState<RiskAlert | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drillParams, setDrillParams] = useState<{ type: "spike" | "symbol"; label: string; timeRange?: string; symbol?: string; window?: { start: number; end: number } } | null>(null);
  const { connected, reconnectCount, reconnect } = useRiskEventsPolling((alert) => {
    setAlerts((prev) => [alert, ...prev].slice(0, 300));
  });

  // ─── 核心指标（接真实数据，非随机）──────────────────────────────────────────
  const [deposit24h, setDeposit24h] = useState(0);
  const [withdraw24h, setWithdraw24h] = useState(0);
  const [largeWithdrawCount, setLargeWithdrawCount] = useState(0);
  const [highRiskIpCount, setHighRiskIpCount] = useState(0);
  const [kycPending, setKycPending] = useState(0);

  // KYC 待审队列 + 高风险 IP 黑名单（真实接口）
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [kycResp, blResp] = await Promise.all([
          api.listKycReviews({ limit: 1 }),
          api.getRiskBlacklist(),
        ]);
        if (!alive) return;
        setKycPending((kycResp as any)?.total ?? 0);
        const items: any[] = (blResp as any)?.items ?? [];
        setHighRiskIpCount(items.filter((i: any) => /^\d{1,3}(\.\d{1,3}){3}$/.test(i?.target ?? "")).length);
      } catch {
        // 上游不可达时保持 0，不伪造
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const liqs: any[] = (data as any)?.liquidations ?? [];
    const liqTotal = liqs.reduce((s, l) => s + (l.equity ?? 0), 0);
    const net = deposit24h - withdraw24h;
    return {
      netDeposit24h: net.toFixed(2),
      largeWithdrawCount,
      highRiskIpCount,
      liquidationTotal: liqTotal.toFixed(2),
      kycPending,
    };
  }, [data, deposit24h, withdraw24h, largeWithdrawCount, highRiskIpCount, kycPending]);

  // ─── 接真实数据：爆仓分布 + 钻取明细（来自风控快照 liquidations）────────────
  const liqDist = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of (data as any)?.liquidations ?? []) {
      const sym = (l.symbol ?? "OTHER").toLowerCase().replace("_usdt", "_USDT").toUpperCase();
      m.set(sym, (m.get(sym) ?? 0) + (l.equity ?? 0));
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name, value: Math.round(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 12);
  }, [data]);

  const drillRows = useMemo(() => {
    return ((data as any)?.liquidations ?? []).map((l: any, i: number) => ({
      id: String(i + 1),
      user_id: l.user_id,
      coin: (l.symbol ?? "-").split("_")[0] ?? "-",
      amount: l.equity ?? 0,
      status: "completed",
      time: l.detected ? new Date(l.detected).toISOString() : new Date(0).toISOString(),
    }));
  }, [data]);

  // spikeWindow 将资金流图中某个桶位的 index 换算为真实时间窗口（毫秒）。
// fundFlow.time 为按从旧到新排列的小时桶，最后一个桶即「现在」。
function spikeWindow(idx: number, bucketCount: number): { start: number; end: number } {
  const bucketMs = 3600000;
  const now = Date.now();
  const pos = Math.max(0, Math.min(idx, bucketCount - 1));
  const end = now - (bucketCount - 1 - pos) * bucketMs;
  return { start: end - bucketMs, end };
}

// ─── 真实充提流水 → 近 24h 资金流走势（按小时分桶，无则留空不伪造）──────────
  const [fundFlow, setFundFlow] = useState<{
    time: string[];
    deposit: number[];
    withdrawal: number[];
    spikes: { idx: number; ts: string; labelKey: string }[];
    truncated?: boolean;
  }>({ time: [], deposit: [], withdrawal: [], spikes: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const LIMIT = 2000;
        const [depResp, wdResp] = await Promise.all([
          api.get<{ deposits: { amount: number; time: string }[]; total: number }>(
            "/api/admin/deposits?limit=" + LIMIT
          ),
          api.get<{ withdrawals: { amount: number; time: string }[]; total: number }>(
            "/api/admin/withdrawals?limit=" + LIMIT
          ),
        ]);
        if (!alive) return;
        const hours = 24;
        const now = Date.now();
        const deposit = new Array(hours).fill(0);
        const withdrawal = new Array(hours).fill(0);
        const deposits = depResp.deposits ?? [];
        const withdrawals = wdResp.withdrawals ?? [];
        for (const d of deposits) {
          const t = new Date(d.time).getTime();
          const h = Math.floor((now - t) / 3600000);
          if (h >= 0 && h < hours) deposit[hours - 1 - h] += d.amount ?? 0;
        }
        for (const w of withdrawals) {
          const t = new Date(w.time).getTime();
          const h = Math.floor((now - t) / 3600000);
          if (h >= 0 && h < hours) withdrawal[hours - 1 - h] += w.amount ?? 0;
        }
        const time = Array.from({ length: hours }, (_, i) => {
          const t = new Date(now - (hours - 1 - i) * 3600000);
          return t.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
        });
        const depTruncated = deposits.length >= LIMIT;
        const wdTruncated = withdrawals.length >= LIMIT;
        setDeposit24h(deposit.reduce((a, b) => a + b, 0));
        setWithdraw24h(withdrawal.reduce((a, b) => a + b, 0));
        setLargeWithdrawCount(withdrawals.filter((w) => (w.amount ?? 0) >= 50000).length);
        setFundFlow({
          time,
          deposit: deposit.map((v) => Math.round(v)),
          withdrawal: withdrawal.map((v) => Math.round(v)),
          spikes: [],
          truncated: depTruncated || wdTruncated,
        });
      } catch {
        if (alive) setFundFlow({ time: [], deposit: [], withdrawal: [], spikes: [] });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const handleFreeze = (userId: number) => {
    setToast(t("riskdash.toast.freeze", { userId }));
    setTimeout(() => setToast(null), 3000);
  };

  const handleMarkHandled = (id: string) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, handled: true } : a));
    setToast(t("riskdash.toast.handled"));
    setTimeout(() => setToast(null), 2000);
  };

  const handleIgnore = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSpikeClick = (spike: { idx: number; ts: string; labelKey: string; deposit: number; withdrawal: number }) => {
    setDrillParams({
      type: "spike",
      label: spike.labelKey,
      timeRange: `${spike.ts}`,
      window: spikeWindow(spike.idx, fundFlow.time.length),
    });
  };

  const handleSymbolClick = (symbol: string) => {
    setDrillParams({
      type: "symbol",
      label: "riskdash.liquidationDetail",
      symbol,
    });
  };

  const criticalCount = alerts.filter((a) => a.level === "critical" && !a.handled).length;
  const warningCount = alerts.filter((a) => a.level === "warning" && !a.handled).length;
  const infoCount = alerts.filter((a) => a.level === "info" && !a.handled).length;

  return (
    <div className="space-y-4">
      {/* 标题栏 */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("riskdash.title")}</h1>
        <div className="flex items-center gap-2">
          <span className={cn("flex items-center gap-1.5 text-xs", connected ? "text-success" : "text-muted-foreground")}>
            {connected ? <PlugZap className="h-3.5 w-3.5" /> : <Plug className="h-3.5 w-3.5" />}
            {connected ? t("riskdash.live") : t("riskdash.disconnected")}
            {reconnectCount > 0 && <span className="text-muted-foreground">(×{reconnectCount})</span>}
          </span>
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            {t("common.refresh")}
          </Button>
          <Button variant="outline" size="sm" onClick={reconnect} disabled={connected}>
            <PlugZap className="h-3.5 w-3.5 mr-1" />
            {t("riskdash.reconnect")}
          </Button>
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {toast && (
        <Alert variant="info" className="animate-pulse">
          {toast}
        </Alert>
      )}

      {/* 核心指标卡 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          label={t("riskdash.netDeposit24h")}
          value={`$${parseFloat(metrics.netDeposit24h).toLocaleString()}`}
          sub={parseFloat(metrics.netDeposit24h) >= 0 ? t("riskdash.netPositive") : t("riskdash.netNegative")}
          tone={parseFloat(metrics.netDeposit24h) >= 0 ? "success" : "destructive"}
          icon={<ArrowDownUp className="h-4 w-4" />}
        />
        <MetricCard
          label={t("riskdash.largeWithdraw")}
          value={String(metrics.largeWithdrawCount)}
          sub={t("riskdash.largeWithdrawSub")}
          tone="warning"
          icon={<ShieldCheck className="h-4 w-4" />}
        />
        <MetricCard
          label={t("riskdash.highRiskIp")}
          value={String(metrics.highRiskIpCount)}
          sub={t("riskdash.highRiskIpSub")}
          tone="info"
          icon={<Search className="h-4 w-4" />}
        />
        <MetricCard
          label={t("riskdash.liquidationTotal")}
          value={`$${parseFloat(metrics.liquidationTotal).toLocaleString()}`}
          sub={t("riskdash.liquidationSub")}
          tone="destructive"
          icon={<TrendingDown className="h-4 w-4" />}
        />
        <MetricCard
          label={t("riskdash.kycPending")}
          value={String(metrics.kycPending)}
          sub={t("riskdash.kycPendingSub")}
          tone="neutral"
          icon={<FileSearch className="h-4 w-4" />}
        />
      </div>

      {/* 图表行：资金流向 + 爆仓分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-2">
          {fundFlow.truncated && (
            <Alert variant="warn" className="text-xs">
              {t("riskdash.fundFlowTruncated")}
            </Alert>
          )}
          <FundFlowChart data={{ ...fundFlow, truncated: undefined }} onSpikeClick={handleSpikeClick} />
        </div>
        <LiquidationDistChart data={liqDist} onSymbolClick={handleSymbolClick} />
      </div>

      {/* 告警统计条 */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="destructive" className="text-xs px-2 py-0.5">
          🔴 {t("riskdash.level.critical")} {criticalCount}
        </Badge>
        <Badge variant="warning" className="text-xs px-2 py-0.5 bg-warning/15 text-warning border-warning/30">
          🟡 {t("riskdash.level.warning")} {warningCount}
        </Badge>
        <Badge variant="info" className="text-xs px-2 py-0.5 bg-info/15 text-info border-info/30">
          🔵 {t("riskdash.level.info")} {infoCount}
        </Badge>
        <span className="text-xs text-muted-foreground ml-1">
          {t("riskdash.totalAlerts", { n: alerts.length })}
        </span>
      </div>

      {/* 主体：中间历史告警列表 + 右侧实时瀑布流 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {/* 中间：历史告警列表（固定高度，可滚动） */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <span className={cn("h-2 w-2 rounded-full", connected ? "bg-success animate-pulse" : "bg-muted-foreground")} />
              {t("riskdash.alertList")}
            </CardTitle>
          </CardHeader>
          <div className="px-3 pb-3 space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin">
            {alerts.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">
                {loading ? t("common.loading") : t("riskdash.noAlerts")}
              </div>
            ) : (
              alerts.slice(0, 50).map((alert) => (
                <LegacyAlertCard
                  key={alert.id}
                  alert={alert}
                  onFreeze={handleFreeze}
                  onHandle={handleMarkHandled}
                  onLogs={setLogAlert}
                />
              ))
            )}
          </div>
        </Card>

        {/* 右侧：实时告警瀑布流 */}
        <Card className="xl:row-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
              {t("riskdash.stream.liveTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-[420px]">
              <AlertStream
                alerts={alerts}
                onFreeze={handleFreeze}
                onIgnore={handleIgnore}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 强平队列 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t("risk.queueTitle")}</CardTitle>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("col.userId")}</TableHead>
              <TableHead>{t("col.symbolPair")}</TableHead>
              <TableHead>{t("col.side")}</TableHead>
              <TableHead>{t("col.positionSize")}</TableHead>
              <TableHead>{t("col.liqPrice")}</TableHead>
              <TableHead>{t("col.equity")}</TableHead>
              <TableHead>{t("col.detected")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {((data as any)?.liquidations ?? []).map((row: any) => (
              <TableRow key={`${row.user_id}-${row.symbol}`}>
                <TableCell className="num">{row.user_id}</TableCell>
                <TableCell>{row.symbol}</TableCell>
                <TableCell>
                  <Badge variant={row.side === "long" ? "default" : "destructive"} className="text-xs">
                    {row.side === "long" ? t("common.buy") : t("common.sell")}
                  </Badge>
                </TableCell>
                <TableCell className="num">{row.size}</TableCell>
                <TableCell className="num">{row.liq_price}</TableCell>
                <TableCell className="num">{row.equity}</TableCell>
                <TableCell className="num text-muted-foreground">{formatDateTime(row.detected)}</TableCell>
              </TableRow>
            ))}
            {((data as any)?.liquidations ?? []).length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-4 text-xs">
                  {t("risk.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <LogDrawer alert={logAlert} onClose={() => setLogAlert(null)} />
      <TransactionDrillDown params={drillParams} rows={drillRows} onClose={() => setDrillParams(null)} />
    </div>
  );
}
