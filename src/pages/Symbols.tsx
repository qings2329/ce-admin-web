import { useState } from "react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";

export function Symbols() {
  const { t } = useI18n();
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) => api.listSymbols(p));
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

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
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
      setSymbol("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    }
  };

  return (
    <div className="page">
      <h1>{t('symbols.title')}</h1>
      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder={t('symbols.pairPh')} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <input placeholder={t('symbols.feeRatePh')} value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.0001" />
        <input placeholder={t('symbols.maxLevPh')} value={lev} onChange={(e) => setLev(e.target.value)} type="number" />
        <button className="btn" type="submit">
          {t('symbols.create')}
        </button>
      </form>

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
          { key: "status", label: t('col.status') },
          { key: "fee_rate", label: t('col.feeRate') },
          { key: "max_leverage", label: t('col.maxLeverage') },
          { key: "min_qty", label: t('col.minQty') },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <button className="btn" onClick={() => toggle(row)}>
                {row.status === "online" ? t('symbols.offline') : t('symbols.online')}
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
