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

export function Chains() {
  const { t } = useI18n();
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) => api.listChains(p));
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [confirmations, setConfirmations] = useState("3");
  const [msg, setMsg] = useState<string | null>(null);

  const toggleDeposit = async (row: any) => {
    try {
      await api.updateChain(row.id, { ...row, deposit_enabled: !row.deposit_enabled });
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    }
  };

  const toggleWithdraw = async (row: any) => {
    try {
      await api.updateChain(row.id, { ...row, withdraw_enabled: !row.withdraw_enabled });
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!name.trim()) {
      setMsg(t('chains.pleaseName'));
      return;
    }
    if (!symbol.trim()) {
      setMsg(t('chains.pleaseSymbol'));
      return;
    }
    if (parseInt(confirmations, 10) < 1) {
      setMsg(t('chains.invalidConfirmations'));
      return;
    }
    setCreating(true);
    try {
      await api.createChain({
        name,
        symbol,
        confirmations: parseInt(confirmations, 10),
        deposit_enabled: true,
        withdraw_enabled: false,
      });
      setName("");
      setSymbol("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-3">
      <h1 className="mb-3 text-lg font-semibold text-foreground">{t('chains.title')}</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {msg && <Alert variant="info">{msg}</Alert>}

      <form className="mb-3 flex flex-wrap items-center gap-2" onSubmit={create}>
        <Input placeholder={t('chains.namePh')} value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder={t('chains.symbolPh')} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <Input placeholder={t('chains.confirmationsPh')} value={confirmations} onChange={(e) => setConfirmations(e.target.value)} type="number" />
        <Button type="submit" disabled={creating} className="gap-1.5">
          {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t('chains.create')}
        </Button>
      </form>

      <ApiTable
        title={t('chains.listTitle')}
        rows={items}
        loading={loading}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: t('col.id'), render: (row: any) => <span className="num">{row.id}</span> },
          { key: "name", label: t('col.name') },
          { key: "symbol", label: t('col.symbol') },
          { key: "confirmations", label: t('col.confirmations'), render: (row: any) => <span className="num">{row.confirmations}</span> },
          {
            key: "deposit_enabled",
            label: t('col.deposit'),
            render: (r: any) => (
              <StatusBadge tone={r.deposit_enabled ? "success" : "neutral"}>
                {r.deposit_enabled ? t('common.on') : t('common.off')}
              </StatusBadge>
            ),
          },
          {
            key: "withdraw_enabled",
            label: t('col.withdraw'),
            render: (r: any) => (
              <StatusBadge tone={r.withdraw_enabled ? "success" : "neutral"}>
                {r.withdraw_enabled ? t('common.on') : t('common.off')}
              </StatusBadge>
            ),
          },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <div className="flex items-center gap-2">
                {row.deposit_enabled ? (
                  <DestructiveActionGuard
                    confirmText={String(row.name || "CONFIRM")}
                    confirmLabel={t('chains.depositOff')}
                    onConfirm={async () => {
                      await toggleDeposit(row);
                    }}
                    trigger={
                      <Button size="sm" variant="destructive" className="border-dashed">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('chains.depositOff')}
                      </Button>
                    }
                  />
                ) : (
                  <Button size="sm" variant="outline" onClick={() => toggleDeposit(row)}>
                    {t('chains.depositOn')}
                  </Button>
                )}
                {row.withdraw_enabled ? (
                  <DestructiveActionGuard
                    confirmText={String(row.name || "CONFIRM")}
                    confirmLabel={t('chains.withdrawOff')}
                    onConfirm={async () => {
                      await toggleWithdraw(row);
                    }}
                    trigger={
                      <Button size="sm" variant="destructive" className="border-dashed">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('chains.withdrawOff')}
                      </Button>
                    }
                  />
                ) : (
                  <Button size="sm" variant="outline" onClick={() => toggleWithdraw(row)}>
                    {t('chains.withdrawOn')}
                  </Button>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
