import { useState } from "react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";

export function Coins() {
  const { t } = useI18n();
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) => api.listCoins(p));
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [chain, setChain] = useState("");
  const [precision, setPrecision] = useState("8");
  const [fee, setFee] = useState("0.0005");
  const [msg, setMsg] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createCoin({
        symbol,
        name,
        chain,
        precision: parseInt(precision, 10),
        withdraw_fee: parseFloat(fee),
      });
      setSymbol("");
      setName("");
      setChain("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    }
  };

  return (
    <div className="page">
      <h1>{t('coins.title')}</h1>
      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder={t('coins.symbolPh')} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <input placeholder={t('coins.namePh')} value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder={t('coins.chainPh')} value={chain} onChange={(e) => setChain(e.target.value)} />
        <input placeholder={t('coins.precisionPh')} value={precision} onChange={(e) => setPrecision(e.target.value)} type="number" />
        <input placeholder={t('coins.feePh')} value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.0001" />
        <button className="btn" type="submit">
          {t('coins.create')}
        </button>
      </form>

      <ApiTable
        title={t('coins.listTitle')}
        rows={items}
        loading={loading}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: "ID" },
          { key: "symbol", label: t('col.symbol') },
          { key: "name", label: t('col.name') },
          { key: "chain", label: t('col.chain') },
          { key: "precision", label: t('col.precision') },
          { key: "withdraw_fee", label: t('col.withdrawFee') },
          { key: "updated_at", label: t('col.updatedAt'), render: (row: any) => formatDateTime(row.updated_at) },
        ]}
      />
    </div>
  );
}
