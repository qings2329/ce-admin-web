import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth, hasPerm } from "../lib/auth";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";

const MARKETS = ["", "spot", "futures"];
const STATUSES = ["", "open", "partial", "filled", "canceled", "rejected"];

// 撮合引擎时间为 Unix 纳秒；统一按时区格式化。
function fmtTime(ts?: number): string {
  return formatDateTime(ts);
}

function sideBadge(side: string, t: (key: string, vars?: Record<string, string | number>) => string): JSX.Element {
  const cls = side === "buy" ? "trade-side buy" : "trade-side sell";
  const label = side === "buy" ? t("common.buy") : side === "sell" ? t("common.sell") : side;
  return <span className={cls}>{label}</span>;
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

export function Orders() {
  const { perms } = useAuth();
  const { t } = useI18n();
  const canRead = hasPerm(perms, "trade:read");
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
    if (!confirm(t("orders.cancelConfirm", { uid: row.user_id, id: row.id, symbol: row.symbol })))
      return;
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
      <div className="page">
        <h1>{t("orders.title")}</h1>
        <div className="alert-error">{t("orders.noPerm")}</div>
      </div>
    );
  }

  return (
      <div className="page">
        <h1>{t("orders.title")}</h1>
        {msg && <div className="alert-info">{msg}</div>}

        <div className="tabs">
          <button
            className={tab === "orders" ? "tab active" : "tab"}
            onClick={() => {
              setTab("orders");
              setPage(1);
            }}
          >
            {t("orders.tabOrders")}
          </button>
          <button
            className={tab === "trades" ? "tab active" : "tab"}
            onClick={() => {
              setTab("trades");
              setPage(1);
            }}
          >
            {t("orders.tabTrades")}
          </button>
        </div>

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
      >
        <input
          placeholder={t("orders.userIdPh")}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <input
          placeholder={t("orders.symbolPh")}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <select value={market} onChange={(e) => setMarket(e.target.value)}>
          {MARKETS.map((m) => (
            <option key={m} value={m}>
              {m === "" ? t("common.allMarket") : marketLabel(m, t)}
            </option>
          ))}
        </select>
        {tab === "orders" && (
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s === "" ? t("common.allStatus") : statusLabel(s, t)}
              </option>
            ))}
          </select>
        )}
        <button className="btn" type="submit">
          {t("orders.query")}
        </button>
      </form>

      <p className="muted">{t("orders.total", { total })}</p>

      {tab === "orders" ? (
        <ApiTable
          title={t("orders.listTitle")}
          rows={rows}
          loading={loading}
          error={error}
          columns={[
            { key: "id", label: t("col.orderId") },
            { key: "user_id", label: t("col.userId") },
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
              render: (r: any) => (r.price ? String(r.price) : t("common.marketPrice")),
            },
            { key: "qty", label: t("col.amount") },
            { key: "filled", label: t("col.filled") },
            { key: "status", label: t("col.status"), render: (r: any) => statusLabel(r.status, t) },
            { key: "created_at", label: t("col.createdAt"), render: (r: any) => fmtTime(r.created_at) },
            {
              key: "op",
              label: t("col.actions"),
              render: (row: any) => (
                <span>
                  <button className="btn" onClick={() => openDetail(row.id)}>
                    {t("orders.detail")}
                  </button>{" "}
                  {canManage && (row.status === "open" || row.status === "partial") && (
                    <button className="btn btn-danger" onClick={() => cancel(row)}>
                      {t("orders.cancel")}
                    </button>
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
            { key: "id", label: t("col.tradeId") },
            { key: "symbol", label: t("col.symbolPair") },
            { key: "market", label: t("col.market"), render: (r: any) => marketLabel(r.market, t) },
            {
              key: "is_margin",
              label: t("col.type"),
              render: (r: any) => (r.is_margin ? t("orders.marginX", { n: r.leverage || "-" }) : t("common.spot")),
            },
            { key: "price", label: t("col.price") },
            { key: "qty", label: t("col.amount") },
            { key: "taker_id", label: t("col.takerUser") },
            { key: "maker_id", label: t("col.makerUser") },
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
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>{t("orders.detailTitle", { id: detail.id })}</h2>
              <button className="btn" onClick={() => setDetail(null)}>
                {t("common.close")}
              </button>
            </div>
            {detailLoading ? (
              <div className="muted">{t("common.loading")}</div>
            ) : (
              <div className="kv-grid">
                <div className="kv">
                  <span className="kv-k">{t("col.userId")}</span>
                  <span className="kv-v">{detail.user_id}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">{t("col.symbolPair")}</span>
                  <span className="kv-v">{detail.symbol}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">{t("col.market")}</span>
                  <span className="kv-v">{marketLabel(detail.market, t)}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">{t("orders.leverage")}</span>
                  <span className="kv-v">{detail.is_margin ? `×${detail.leverage || "-"}` : t("common.spot")}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">{t("col.side")}</span>
                  <span className="kv-v">{detail.side}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">{t("col.price")}</span>
                  <span className="kv-v">{detail.price ? String(detail.price) : t("common.marketPrice")}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">{t("col.amount")}</span>
                  <span className="kv-v">{detail.qty}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">{t("col.filled")}</span>
                  <span className="kv-v">{detail.filled}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">{t("col.status")}</span>
                  <span className="kv-v">{statusLabel(detail.status, t)}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">TimeInForce</span>
                  <span className="kv-v">{detail.time_in_force || "-"}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">{t("col.createdAt")}</span>
                  <span className="kv-v">{fmtTime(detail.created_at)}</span>
                </div>
                <div className="kv">
                  <span className="kv-k">{t("col.updatedAt")}</span>
                  <span className="kv-v">{fmtTime(detail.updated_at)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
