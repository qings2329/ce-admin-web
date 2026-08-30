import { useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";
import { Modal } from "../components/ui/Modal";

export function Coins() {
  const { t } = useI18n();
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) => api.listCoins(p));
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [chain, setChain] = useState("");
  const [precision, setPrecision] = useState("8");
  const [fee, setFee] = useState("0.0005");
  const [msg, setMsg] = useState<string | null>(null);

  const openCreate = () => {
    setSymbol("");
    setName("");
    setChain("");
    setPrecision("8");
    setFee("0.0005");
    setMsg(null);
    setShowCreate(true);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!symbol.trim()) {
      setMsg(t('coins.pleaseSymbol'));
      return;
    }
    if (!name.trim()) {
      setMsg(t('coins.pleaseName'));
      return;
    }
    if (!chain.trim()) {
      setMsg(t('coins.pleaseChain'));
      return;
    }
    if (parseInt(precision, 10) < 1) {
      setMsg(t('coins.invalidPrecision'));
      return;
    }
    if (parseFloat(fee) < 0) {
      setMsg(t('coins.invalidFee'));
      return;
    }
    setCreating(true);
    try {
      await api.createCoin({
        symbol,
        name,
        chain,
        precision: parseInt(precision, 10),
        withdraw_fee: parseFloat(fee),
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
      <h1 className="mb-3 text-lg font-semibold text-foreground">{t('coins.title')}</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {msg && <Alert variant="info">{msg}</Alert>}

      <Button onClick={openCreate} className="mb-3">
        {t('coins.create')}
      </Button>

      <Modal
        open={showCreate}
        title={t('coins.create')}
        onClose={() => setShowCreate(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={(e: any) => create(e)} disabled={creating} className="gap-1.5">
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('coins.create')}
            </Button>
          </>
        }
        size="md"
      >
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('coins.symbolPh')}</label>
            <Input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder={t('coins.symbolPh')} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('coins.namePh')}</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('coins.namePh')} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('coins.chainPh')}</label>
            <Input value={chain} onChange={(e) => setChain(e.target.value)} placeholder={t('coins.chainPh')} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('coins.precisionPh')}</label>
            <Input value={precision} onChange={(e) => setPrecision(e.target.value)} type="number" placeholder={t('coins.precisionPh')} />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t('coins.feePh')}</label>
            <Input value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.0001" placeholder={t('coins.feePh')} />
          </div>
        </div>
      </Modal>

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
