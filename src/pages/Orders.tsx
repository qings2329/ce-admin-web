import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "../api/client";
import { useAuth, hasPerm } from "../lib/auth";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { StatusBadge, type StatusTone } from "../components/ui/status-badge";
import { Alert } from "../components/ui/alert";
import { DestructiveActionGuard } from "../components/ui/DestructiveActionGuard";
import { Card } from "../components/ui/card";

const MARKETS = ["", "spot", "futures"];
const STATUSES = ["", "open", "partial", "filled", "canceled", "rejected"];

// 撮合引擎时间为 Unix 纳秒；统一按时区格式化。
function fmtTime(ts?: number): string {
  return formatDateTime(ts);
}

function sideBadge(side: string, t: (key: string, vars?: Record<string, string | number>) => string): JSX.Element {
  const tone = side === "buy" ? "success" : "danger";
  const label = side === "buy" ? t("common.buy") : side === "sell" ? t("common.sell") : side;
  return <StatusBadge tone={tone}>{label}</StatusBadge>;
}

function marketLabel(m: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (m === "spot") return t("common.spot");
  if (m === "futures") return t("common.futures");
  return m || "-";
}

function statusLabel(s: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  switch (s) {
    case "open":
      return t("orders.stPending");
    case "partial":
      return t("orders.stPartial");
    case "filled":
      return t("orders.stFilled");
    case "canceled":
      return t("orders.stCanceled");
    case "rejected":
      return t("orders.stRejected");
    default:
      return s || "-";
  }
}

// 订单状态 → 状态色（语义推断：成交=成功、拒绝=危险、取消=中性、挂单/部分成交=待处理）。
function orderStatusTone(s: string): StatusTone {
  switch (s) {
    case "filled":
      return "success";
    case "rejected":
      return "danger";
    case "canceled":
      return "neutral";
    case "open":
    case "partial":
      return "warning";
    default:
      return "neutral";
  }
}

export function Orders() {
  const { perms } = useAuth();
  const { t } = useI18n();
  const canRead = hasPerm(perms, "trade:view");
  const canManage = hasPerm(perms, "trade:manage");

  const [tab, setTab] = useState<"orders" | "trades">("orders");
  const [userId, setUserId] = useState("");
  const [symbol, setSymbol] = useState("");
  const [market, setMarket] = useState("");
  const [status, setStatus] = useState("");

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [detail, setDetail] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const params: any = { limit, offset: (page - 1) * limit };
      if (userId.trim()) params.user_id = userId.trim();
      if (symbol.trim()) params.symbol = symbol.trim();
      if (market) params.market = market;
      if (tab === "orders" && status) params.status = status;
      if (tab === "orders") {
        const r = await api.listOrders(params);
        setRows(r.orders ?? []);
        setTotal(r.total ?? 0);
      } else {
        const r = await api.listTrades(params);
        setRows(r.trades ?? []);
        setTotal(r.total ?? 0);
      }
    } catch (e: any) {
      setError(e?.message ?? t("common.queryFailed"));
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  // 切换 Tab、翻页、调整每页条数（有权限时）触发查询。
  useEffect(() => {
    if (canRead) runQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, limit]);

  // 支持 Command Palette 深度链接：#/orders?user_id= 或 ?q= 预填并强查
  useEffect(() => {
    const sp = new URLSearchParams(location.hash.split("?")[1] ?? "");
    const target = sp.get("user_id") || sp.get("q");
    if (!target || !canRead) return;
    setUserId(target);
    setPage(1);
    setLoading(true);
    setError(null);
    api
      .listOrders({ limit, offset: 0, user_id: target })
      .then((r) => {
        setRows(r.orders ?? []);
        setTotal(r.total ?? 0);
      })
      .catch((e: any) => setError(e?.message ?? t("common.queryFailed")))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const r = await api.getOrder(id);
      setDetail(r?.order ?? r);
    } catch (e: any) {
      setMsg(e?.message ?? t("orders.fetchDetailFailed"));
    } finally {
      setDetailLoading(false);
    }
  };

  const cancel = async (row: any) => {
    if (!canManage) return;
    setMsg(null);
    try {
      const r = await api.cancelOrder(row.id, row.symbol);
      setMsg(
        r?.canceled
          ? t("orders.cancelSubmitted", { id: row.id })
          : t("orders.cancelNotEffective", { id: row.id }),
      );
      runQuery();
    } catch (e: any) {
      setMsg(e?.message ?? t("orders.cancelFailed"));
    }
  };

  if (!canRead) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">{t("orders.title")}</h1>
        <Alert variant="error">{t("orders.noPerm")}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{t("orders.title")}</h1>
      {msg && <Alert variant="info">{msg}</Alert>}

      <div className="flex gap-1.5 mb-3">
        <Button
          variant={tab === "orders" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setTab("orders");
            setPage(1);
          }}
        >
          {t("orders.tabOrders")}
        </Button>
        <Button
          variant={tab === "trades" ? "default" : "outline"}
          size="sm"
          onClick={() => {
            setTab("trades");
            setPage(1);
          }}
        >
          {t("orders.tabTrades")}
        </Button>
      </div>

      <form
        className="flex flex-wrap items-center gap-2 mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
      >
        <Input
          placeholder={t("orders.userIdPh")} className="max-w-xs"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <Input
          placeholder={t("orders.symbolPh")} className="max-w-xs"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <Select value={market} onChange={(e) => setMarket(e.target.value)}>
          {MARKETS.map((m) => (
            <option key={m} value={m}>
              {m === "" ? t("common.allMarket") : marketLabel(m, t)}
            </option>
          ))}
        </Select>
        {tab === "orders" && (
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "" ? t("common.allStatus") : statusLabel(s, t)}
              </option>
            ))}
          </Select>
        )}
        <Button type="submit">{t("orders.query")}</Button>
      </form>

      <p className="text-xs text-muted-foreground">{t("orders.total", { total })}</p>

      {tab === "orders" ? (
        <ApiTable
          title={t("orders.listTitle")}
          rows={rows}
          loading={loading}
          error={error}
          columns={[
            { key: "id", label: t("col.orderId"), render: (r: any) => <span className="num">{r.id}</span> },
            { key: "user_id", label: t("col.userId"), render: (r: any) => <span className="num">{r.user_id}</span> },
            { key: "symbol", label: t("col.symbolPair") },
            { key: "market", label: t("col.market"), render: (r: any) => marketLabel(r.market, t) },
            {
              key: "is_margin",
              label: t("col.type"),
              render: (r: any) => (r.is_margin ? t("orders.marginX", { n: r.leverage || "-" }) : t("common.spot")),
            },
            { key: "side", label: t("col.side"), render: (r: any) => sideBadge(r.side, t) },
            {
              key: "price",
              label: t("col.price"),
              render: (r: any) =>
                r.price ? <span className="num">{String(r.price)}</span> : t("common.marketPrice"),
            },
            { key: "qty", label: t("col.amount"), render: (r: any) => <span className="num">{r.qty}</span> },
            { key: "filled", label: t("col.filled"), render: (r: any) => <span className="num">{r.filled}</span> },
            { key: "status", label: t("col.status"), render: (r: any) => <StatusBadge tone={orderStatusTone(r.status)}>{statusLabel(r.status, t)}</StatusBadge> },
            { key: "created_at", label: t("col.createdAt"), render: (r: any) => fmtTime(r.created_at) },
            {
              key: "op",
              label: t("col.actions"),
              render: (row: any) => (
                <span className="flex flex-wrap items-center gap-2">
                  <Button onClick={() => openDetail(row.id)}>{t("orders.detail")}</Button>
                  {canManage && (row.status === "open" || row.status === "partial") && (
                    <DestructiveActionGuard
                      confirmText={String(row.id)}
                      confirmLabel={t("orders.cancel")}
                      onConfirm={async () => {
                        await cancel(row);
                      }}
                      trigger={
                        <Button variant="destructive" className="border-dashed">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {t("orders.cancel")}
                        </Button>
                      }
                    />
                  )}
                </span>
              ),
            },
          ]}
        />
      ) : (
        <ApiTable
          title={t("orders.tradesTitle")}
          rows={rows}
          loading={loading}
          error={error}
          columns={[
            { key: "id", label: t("col.tradeId"), render: (r: any) => <span className="num">{r.id}</span> },
            { key: "symbol", label: t("col.symbolPair") },
            { key: "market", label: t("col.market"), render: (r: any) => marketLabel(r.market, t) },
            {
              key: "is_margin",
              label: t("col.type"),
              render: (r: any) => (r.is_margin ? t("orders.marginX", { n: r.leverage || "-" }) : t("common.spot")),
            },
            { key: "price", label: t("col.price"), render: (r: any) => <span className="num">{r.price}</span> },
            { key: "qty", label: t("col.amount"), render: (r: any) => <span className="num">{r.qty}</span> },
            { key: "taker_id", label: t("col.takerUser"), render: (r: any) => <span className="num">{r.taker_id}</span> },
            { key: "maker_id", label: t("col.makerUser"), render: (r: any) => <span className="num">{r.maker_id}</span> },
            { key: "taker_side", label: t("col.takerSide"), render: (r: any) => sideBadge(r.taker_side, t) },
            { key: "time", label: t("col.tradeTime"), render: (r: any) => fmtTime(r.time) },
          ]}
        />
      )}

      {total > 0 && (
        <Pager
          total={total}
          limit={limit}
          page={page}
          onChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      )}

      {detail && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55"
          onClick={() => setDetail(null)}
        >
          <div
            className="rounded-xl border border-border bg-card p-4 w-[min(560px,92vw)] max-h-[86vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{t("orders.detailTitle", { id: detail.id })}</h2>
              <Button variant="ghost" onClick={() => setDetail(null)}>
                {t("common.close")}
              </Button>
            </div>
            {detailLoading ? (
              <div className="text-xs text-muted-foreground">{t("common.loading")}</div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("col.userId")}</span>
                  <span className="text-base font-semibold num">{detail.user_id}</span>
                </Card>
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("col.symbolPair")}</span>
                  <span className="text-base font-semibold">{detail.symbol}</span>
                </Card>
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("col.market")}</span>
                  <span className="text-base font-semibold">{marketLabel(detail.market, t)}</span>
                </Card>
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("orders.leverage")}</span>
                  <span className="text-base font-semibold">
                    {detail.is_margin ? <span className="num">×{detail.leverage || "-"}</span> : t("common.spot")}
                  </span>
                </Card>
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("col.side")}</span>
                  <span className="text-base font-semibold">{detail.side}</span>
                </Card>
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("col.price")}</span>
                  <span className="text-base font-semibold">
                    {detail.price ? <span className="num">{String(detail.price)}</span> : t("common.marketPrice")}
                  </span>
                </Card>
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("col.amount")}</span>
                  <span className="text-base font-semibold num">{detail.qty}</span>
                </Card>
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("col.filled")}</span>
                  <span className="text-base font-semibold num">{detail.filled}</span>
                </Card>
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("col.status")}</span>
                  <span className="text-base font-semibold">{statusLabel(detail.status, t)}</span>
                </Card>
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">TimeInForce</span>
                  <span className="text-base font-semibold">{detail.time_in_force || "-"}</span>
                </Card>
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("col.createdAt")}</span>
                  <span className="text-base font-semibold">{fmtTime(detail.created_at)}</span>
                </Card>
                <Card className="p-3 flex flex-col gap-1.5">
                  <span className="text-xs text-muted-foreground">{t("col.updatedAt")}</span>
                  <span className="text-base font-semibold">{fmtTime(detail.updated_at)}</span>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
