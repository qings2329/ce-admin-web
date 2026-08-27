import { useState } from "react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";

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
    <div className="space-y-3">
      <h1 className="mb-3 text-lg font-semibold text-foreground">{t('coins.title')}</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {msg && <Alert variant="info">{msg}</Alert>}

      <form className="mb-3 flex flex-wrap items-center gap-2" onSubmit={create}>
        <Input placeholder={t('coins.symbolPh')} value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <Input placeholder={t('coins.namePh')} value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder={t('coins.chainPh')} value={chain} onChange={(e) => setChain(e.target.value)} />
        <Input placeholder={t('coins.precisionPh')} value={precision} onChange={(e) => setPrecision(e.target.value)} type="number" />
        <Input placeholder={t('coins.feePh')} value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.0001" />
        <Button type="submit">
          {t('coins.create')}
        </Button>
      </form>

      <ApiTable
        title={t('coins.listTitle')}
        rows={items}
        loading={loading}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: "ID", render: (row: any) => <span className="num">{row.id}</span> },
          { key: "symbol", label: t('col.symbol') },
          { key: "name", label: t('col.name') },
          { key: "chain", label: t('col.chain') },
          { key: "precision", label: t('col.precision'), render: (row: any) => <span className="num">{row.precision}</span> },
          { key: "withdraw_fee", label: t('col.withdrawFee'), render: (row: any) => <span className="num">{row.withdraw_fee}</span> },
          { key: "updated_at", label: t('col.updatedAt'), render: (row: any) => <span className="num">{formatDateTime(row.updated_at)}</span> },
        ]}
      />
    </div>
  );
}
