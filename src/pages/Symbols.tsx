import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";
import { DestructiveActionGuard } from "../components/ui/DestructiveActionGuard";
import { StatusBadge } from "../components/ui/status-badge";
import { Modal } from "../components/ui/Modal";

export function Symbols() {
  const { t } = useI18n();
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) => api.listSymbols(p));
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [fee, setFee] = useState("0.001");
  const [lev, setLev] = useState("20");
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = async (row: any) => {
    const next = row.status === "online" ? "offline" : "online";
    try {
      await api.upsertSymbol({ ...row, status: next });
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    }
  };

  const openCreate = () => {
    setSymbol("");
    setFee("0.001");
    setLev("20");
    setMsg(null);
    setShowCreate(true);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!symbol.trim()) {
      setMsg(t('symbols.pleaseSymbol'));
      return;
    }
    if (parseFloat(fee) < 0) {
      setMsg(t('symbols.invalidFee'));
      return;
    }
    if (parseInt(lev, 10) < 1) {
      setMsg(t('symbols.invalidLev'));
      return;
    }
    setCreating(true);
    const [base, quote] = symbol.split("_");
    try {
      await api.upsertSymbol({
        symbol,
        base: base || symbol,
        quote: quote || "USDT",
        status: "online",
        fee_rate: parseFloat(fee),
        max_leverage: parseInt(lev, 10),
        min_qty: 0.0001,
      });
      setShowCreate(false);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <h1 className="mb-3 text-lg font-semibold text-foreground">{t('symbols.title')}</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {msg && <Alert variant="info">{msg}</Alert>}

      <Button onClick={openCreate} className="mb-3">
        {t('symbols.create')}
      </Button>

      <Modal
        open={showCreate}
        title={t('symbols.create')}
        onClose={() => setShowCreate(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={(e: any) => create(e)} disabled={creating} className="gap-1.5">
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('symbols.create')}
            </Button>
          </>
        }
        size="md"
      >
        <form onSubmit={create} className="space-y-4">
          <Input placeholder={t('symbols.pairPh')} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
          <Input placeholder={t('symbols.feeRatePh')} value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.0001" />
          <Input placeholder={t('symbols.maxLevPh')} value={lev} onChange={(e) => setLev(e.target.value)} type="number" />
        </form>
      </Modal>

      <ApiTable
        title={t('symbols.listTitle')}
        rows={items}
        loading={loading}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "symbol", label: t('col.symbolPair') },
          { key: "base", label: t('col.base') },
          { key: "quote", label: t('col.quote') },
          {
            key: "status",
            label: t('col.status'),
            render: (row: any) => (
              <StatusBadge tone={row.status === "online" ? "success" : "neutral"}>
                {row.status}
              </StatusBadge>
            ),
          },
          { key: "fee_rate", label: t('col.feeRate'), render: (row: any) => <span className="num">{row.fee_rate}</span> },
          { key: "max_leverage", label: t('col.maxLeverage'), render: (row: any) => <span className="num">{row.max_leverage}</span> },
          { key: "min_qty", label: t('col.minQty'), render: (row: any) => <span className="num">{row.min_qty}</span> },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <>
              {row.status === "online" ? (
                <DestructiveActionGuard
                  confirmText={String(row.symbol || "CONFIRM")}
                  confirmLabel={t('symbols.offline')}
                  onConfirm={async () => {
                    await toggle(row);
                  }}
                  trigger={
                    <Button size="sm" variant="destructive" className="border-dashed">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('symbols.offline')}
                    </Button>
                  }
                />
              ) : (
                <Button size="sm" variant="outline" onClick={() => toggle(row)}>
                  {t('symbols.online')}
                </Button>
              )}
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
