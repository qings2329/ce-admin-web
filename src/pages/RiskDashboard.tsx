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
  user_id?: number;
  amount?: number;
  coin?: string;
  ip?: string;
  country?: string;
  occurred_at: string;
  handled?: boolean;
}

// ─── 模拟风控告警模板（i18n key，渲染时 t() 解析）──────────────────────────────
const CRITICAL_TEMPLATES = [
  { titleKey: "riskdash.tpl.withdrawIntercept.title", descKey: "riskdash.tpl.withdrawIntercept.desc" },
  { titleKey: "riskdash.tpl.washTrading.title", descKey: "riskdash.tpl.washTrading.desc" },
  { titleKey: "riskdash.tpl.crossBorderIp.title", descKey: "riskdash.tpl.crossBorderIp.desc" },
  { titleKey: "riskdash.tpl.moneyLaundering.title", descKey: "riskdash.tpl.moneyLaundering.desc" },
  { titleKey: "riskdash.tpl.highFreqCancel.title", descKey: "riskdash.tpl.highFreqCancel.desc" },
];

const WARNING_TEMPLATES = [
  { titleKey: "riskdash.tpl.passwordErrors.title", descKey: "riskdash.tpl.passwordErrors.desc" },
  { titleKey: "riskdash.tpl.largeTransfer.title", descKey: "riskdash.tpl.largeTransfer.desc" },
  { titleKey: "riskdash.tpl.newDevice.title", descKey: "riskdash.tpl.newDevice.desc" },
  { titleKey: "riskdash.tpl.proxyIp.title", descKey: "riskdash.tpl.proxyIp.desc" },
];

const INFO_TEMPLATES = [
  { titleKey: "riskdash.tpl.kyc2Pass.title", descKey: "riskdash.tpl.kyc2Pass.desc" },
  { titleKey: "riskdash.tpl.newFutures.title", descKey: "riskdash.tpl.newFutures.desc" },
  { titleKey: "riskdash.tpl.whitelistAddr.title", descKey: "riskdash.tpl.whitelistAddr.desc" },
];

function pickTemplate(level: AlertLevel) {
  const pool =
    level === "critical" ? CRITICAL_TEMPLATES
    : level === "warning" ? WARNING_TEMPLATES
    : INFO_TEMPLATES;
  const t = pool[Math.floor(Math.random() * pool.length)];
  const userId = Math.floor(Math.random() * 50000) + 1000;
  const coin = ["USDT", "BTC", "ETH"][Math.floor(Math.random() * 3)];
  const amount = level === "critical"
    ? parseFloat((Math.random() * 500000 + 100000).toFixed(2))
    : parseFloat((Math.random() * 50000 + 1000).toFixed(2));
  const ip = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  const countries = ["NG", "RU", "IR", "KP", "US", "GB", "DE", "JP", "VN", "BR"];
  return {
    ...t,
    user_id: userId,
    amount,
    coin,
    ip,
    country: countries[Math.floor(Math.random() * countries.length)],
  };
}

// ─── WebSocket 模拟 Hook ──────────────────────────────────────────────────────
function useRiskWebSocket(onAlert: (alert: RiskAlert) => void) {
  const [connected, setConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    setConnected(true);
    setReconnectCount(0);
    const emit = () => {
      const r = Math.random();
      const level: AlertLevel = r < 0.25 ? "critical" : r < 0.6 ? "warning" : "info";
      const tpl = pickTemplate(level);
      onAlert({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        level,
        titleKey: tpl.titleKey,
        descKey: tpl.descKey,
        user_id: tpl.user_id,
        amount: tpl.amount,
        coin: tpl.coin,
        ip: tpl.ip,
        country: tpl.country,
        occurred_at: new Date().toISOString(),
      });
    };
    emit();
    intervalRef.current = setInterval(emit, 8000 + Math.random() * 12000);
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
        <p className="text-sm font-semibold leading-snug">{t(alert.titleKey)}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t(alert.descKey)}</p>
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
              <p>[{formatDateTime(alert.occurred_at)}] uid={alert.user_id} score=0.{Math.floor(Math.random() * 900 + 100)}</p>
              <p>[{formatDateTime(alert.occurred_at)}] rule_triggered: [{t(alert.titleKey).replace(/"/g, '\\"')}]</p>
              {alert.amount && <p>[{formatDateTime(alert.occurred_at)}] amount={<MaskedText value={alert.amount} mask="balance" />} coin={alert.coin}</p>}
              <p>[{formatDateTime(alert.occurred_at)}] model.confidence={(Math.random() * 0.3 + 0.7).toFixed(3)}</p>
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
  const [drillParams, setDrillParams] = useState<{ type: "spike" | "symbol"; label: string; timeRange?: string; symbol?: string } | null>(null);
  const { connected, reconnectCount, reconnect } = useRiskWebSocket((alert) => {
    setAlerts((prev) => [alert, ...prev].slice(0, 300));
  });

  const metrics = useMemo(() => ({
    netDeposit24h: (Math.random() * 20000000 - 5000000).toFixed(2),
    largeWithdrawCount: Math.floor(Math.random() * 15) + 3,
    highRiskIpCount: Math.floor(Math.random() * 50) + 10,
    liquidationTotal: (Math.random() * 5000000 + 500000).toFixed(2),
    kycPending: Math.floor(Math.random() * 200) + 30,
  }), [data]);

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
        <div className="lg:col-span-2">
          <FundFlowChart onSpikeClick={handleSpikeClick} />
        </div>
        <LiquidationDistChart onSymbolClick={handleSymbolClick} />
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
      <TransactionDrillDown params={drillParams} onClose={() => setDrillParams(null)} />
    </div>
  );
}
