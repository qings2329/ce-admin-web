import { useState } from "react";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { cn } from "../lib/utils";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";
import { StatusBadge } from "../components/ui/status-badge";

// 结算/成交时间一般为 Unix 毫秒；统一按时区格式化展示。
function fmtTime(ts?: number): string {
  return formatDateTime(ts);
}

function Kv({ k, v, num }: { k: string; v: string; num?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className={cn("text-base font-semibold", num && "num")}>{v}</span>
    </div>
  );
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
    <div className="space-y-4">
      <h1 className="text-lg font-semibold mb-3">{t('ops.title')}</h1>
      {msg && <Alert variant="info">{msg}</Alert>}

      <h2 className="mb-3 text-base font-semibold">{t('ops.ledger')}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Kv k={t('ops.totalAssets')} v={ld?.total_assets ?? "-"} num />
        <Kv k={t('ops.settleBalance')} v={ld?.settlement_balance ?? "-"} num />
        <Kv k={t('ops.reconciled')} v={ld?.reconciled ? t('common.yes') : t('common.no')} />
        <Kv k={t('ops.diff')} v={ld?.discrepancy ?? "-"} num />
      </div>

      <h2 className="mb-3 text-base font-semibold">{t('ops.settleRealTime')}</h2>
      {ld?.settlement?.enabled ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Kv k={t('ops.totalTrades')} v={String(ld.settlement.total_trades ?? 0)} num />
            <Kv k={t('ops.totalVolume')} v={String(ld.settlement.total_volume ?? 0)} num />
            <Kv k={t('ops.totalCommission')} v={String(ld.settlement.total_commission ?? 0)} num />
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
                    <StatusBadge tone={r.taker_side === "buy" ? "success" : "danger"}>
                      {r.taker_side}
                    </StatusBadge>
                  ),
                },
                { key: "fee", label: t('col.fee') },
                { key: "ts", label: t('col.time'), render: (r: any) => fmtTime(r.ts) },
              ]}
            />
          )}
        </>
      ) : (
        <p className="text-muted-foreground text-xs">{ld?.settlement?.notes || t('ops.settleUnconfigured')}</p>
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

      <h2 className="mb-3 text-base font-semibold">{t('ops.notif')}</h2>
      <form className="flex flex-wrap items-center gap-2 mb-3" onSubmit={createNotif}>
        <Input placeholder={t('ops.notifTitlePh')} value={title} onChange={(e) => setTitle(e.target.value)} />
        <Input placeholder={t('ops.notifBodyPh')} value={body} onChange={(e) => setBody(e.target.value)} />
        <Select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="critical">critical</option>
        </Select>
        <Button type="submit">{t('ops.publishNotif')}</Button>
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
              <Button variant="outline" size="sm" onClick={() => delNotif(row.id)}>
                {t('common.delete')}
              </Button>
            ),
          },
        ]}
      />
      <p className="text-muted-foreground text-xs">
        {t('ops.note')}
      </p>
    </div>
  );
}
