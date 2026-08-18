import { useState } from "react";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";

// 结算/成交时间一般为 Unix 毫秒；统一按时区格式化展示。
function fmtTime(ts?: number): string {
  return formatDateTime(ts);
}

export function Ops() {
  const { t } = useI18n();
  const ledger = useFetch(api.getLedger);
  const services = useFetch(api.getServices);
  const notifs = usePaged((p) => api.listNotifications(p));

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [msg, setMsg] = useState<string | null>(null);

  const createNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createNotification({ title, body, level });
      setTitle("");
      setBody("");
      notifs.reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    }
  };

  const delNotif = async (id: number) => {
    try {
      await api.deleteNotification(id);
      notifs.reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.deleteFailed'));
    }
  };

  const ld = ledger.data as any;

  return (
    <div className="page">
      <h1>{t('ops.title')}</h1>
      {msg && <div className="alert-info">{msg}</div>}

      <h2>{t('ops.ledger')}</h2>
      <div className="kv-grid">
        <div className="kv">
          <span className="kv-k">{t('ops.totalAssets')}</span>
          <span className="kv-v">{ld?.total_assets ?? "-"}</span>
        </div>
        <div className="kv">
          <span className="kv-k">{t('ops.settleBalance')}</span>
          <span className="kv-v">{ld?.settlement_balance ?? "-"}</span>
        </div>
        <div className="kv">
          <span className="kv-k">{t('ops.reconciled')}</span>
          <span className="kv-v">{ld?.reconciled ? t('common.yes') : t('common.no')}</span>
        </div>
        <div className="kv">
          <span className="kv-k">{t('ops.diff')}</span>
          <span className="kv-v">{ld?.discrepancy ?? "-"}</span>
        </div>
      </div>

      <h2>{t('ops.settleRealTime')}</h2>
      {ld?.settlement?.enabled ? (
        <>
          <div className="kv-grid">
            <div className="kv">
              <span className="kv-k">{t('ops.totalTrades')}</span>
              <span className="kv-v">{String(ld.settlement.total_trades ?? 0)}</span>
            </div>
            <div className="kv">
              <span className="kv-k">{t('ops.totalVolume')}</span>
              <span className="kv-v">{String(ld.settlement.total_volume ?? 0)}</span>
            </div>
            <div className="kv">
              <span className="kv-k">{t('ops.totalCommission')}</span>
              <span className="kv-v">{String(ld.settlement.total_commission ?? 0)}</span>
            </div>
          </div>
          {ld.settlement.recent && ld.settlement.recent.length > 0 && (
            <ApiTable
              title={t('ops.recentCleared')}
              rows={ld.settlement.recent}
              columns={[
                { key: "id", label: t('col.tradeId') },
                { key: "symbol", label: t('col.symbolPair') },
                { key: "price", label: t('col.price') },
                { key: "qty", label: t('col.amount') },
                {
                  key: "taker_side",
                  label: t('col.takerSide'),
                  render: (r: any) => (
                    <span className={r.taker_side === "buy" ? "trade-side buy" : "trade-side sell"}>
                      {r.taker_side}
                    </span>
                  ),
                },
                { key: "fee", label: t('col.fee') },
                { key: "ts", label: t('col.time'), render: (r: any) => fmtTime(r.ts) },
              ]}
            />
          )}
        </>
      ) : (
        <div className="muted">{ld?.settlement?.notes || t('ops.settleUnconfigured')}</div>
      )}

      <ApiTable
        title={t('ops.serviceHealth')}
        rows={services.data ?? []}
        loading={services.loading}
        error={services.error}
        onReload={services.reload}
        columns={[
          { key: "name", label: t('col.service') },
          { key: "status", label: t('col.status') },
          { key: "latency_ms", label: t('col.latency') },
          { key: "last_check", label: t('col.lastCheck') },
        ]}
      />

      <h2>{t('ops.notif')}</h2>
      <form className="inline-form" onSubmit={createNotif}>
        <input placeholder={t('ops.notifTitlePh')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder={t('ops.notifBodyPh')} value={body} onChange={(e) => setBody(e.target.value)} />
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="critical">critical</option>
        </select>
        <button className="btn" type="submit">
          {t('ops.publishNotif')}
        </button>
      </form>

      <ApiTable
        title={t('ops.notifList')}
        rows={notifs.items}
        loading={notifs.loading}
        error={notifs.error}
        onReload={notifs.reload}
        actions={
          <Pager
            total={notifs.total}
            limit={notifs.limit}
            page={notifs.page}
            onChange={notifs.changePage}
            onLimitChange={notifs.changeLimit}
          />
        }
        columns={[
          { key: "id", label: "ID" },
          { key: "title", label: t('col.title') },
          { key: "body", label: t('col.body') },
          { key: "level", label: t('col.level') },
          { key: "created_at", label: t('col.publishedAt') },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <button className="btn" onClick={() => delNotif(row.id)}>
                {t('common.delete')}
              </button>
            ),
          },
        ]}
      />
      <p className="muted">
        {t('ops.note')}
      </p>
    </div>
  );
}
