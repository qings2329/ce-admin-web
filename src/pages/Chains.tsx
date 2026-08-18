import { useState } from "react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";

export function Chains() {
  const { t } = useI18n();
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) => api.listChains(p));
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
    }
  };

  return (
    <div className="page">
      <h1>{t('chains.title')}</h1>
      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder={t('chains.namePh')} value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder={t('chains.symbolPh')} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <input placeholder={t('chains.confirmationsPh')} value={confirmations} onChange={(e) => setConfirmations(e.target.value)} type="number" />
        <button className="btn" type="submit">
          {t('chains.create')}
        </button>
      </form>

      <ApiTable
        title={t('chains.listTitle')}
        rows={items}
        loading={loading}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: t('col.id') },
          { key: "name", label: t('col.name') },
          { key: "symbol", label: t('col.symbol') },
          { key: "confirmations", label: t('col.confirmations') },
          { key: "deposit_enabled", label: t('col.deposit'), render: (r: any) => (r.deposit_enabled ? t('common.on') : t('common.off')) },
          { key: "withdraw_enabled", label: t('col.withdraw'), render: (r: any) => (r.withdraw_enabled ? t('common.on') : t('common.off')) },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <span>
                <button className="btn" onClick={() => toggleDeposit(row)}>
                  {row.deposit_enabled ? t('chains.depositOff') : t('chains.depositOn')}
                </button>{" "}
                <button className="btn" onClick={() => toggleWithdraw(row)}>
                  {row.withdraw_enabled ? t('chains.withdrawOff') : t('chains.withdrawOn')}
                </button>
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
