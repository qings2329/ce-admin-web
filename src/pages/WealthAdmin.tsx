import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Alert } from "../components/ui/alert";
import { ApiTable } from "../components/ApiTable";
import { Modal } from "../components/ui/Modal";
import { Loader2, Plus, RefreshCw } from "lucide-react";

type Tab = "products" | "holdings";

export function WealthAdmin() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("products");
  const [products, setProducts] = useState<any[]>([]);
  const [holdings, setHoldings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formBusy, setFormBusy] = useState(false);
  const [form, setForm] = useState({ name: "", asset: "USDT", type: "current", annualRate: "", durationDays: "0", minAmount: "" });
  const [accruing, setAccruing] = useState(false);

  const load = async (target?: Tab) => {
    if (target) setTab(target);
    setLoading(true);
    setError(null);
    try {
      if (target ?? tab === "products") {
        const d = await api.listWealthProducts();
        setProducts(d.products ?? []);
      } else {
        const d = await api.listWealthHoldings();
        setHoldings(d.holdings ?? []);
      }
    } catch (e: any) {
      setError(e?.message ?? t("common.queryFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async () => {
    const { name, asset, type, annualRate, durationDays, minAmount } = form;
    if (!name || !annualRate || !minAmount) {
      setError(t("wealth.formRequired"));
      return;
    }
    setFormBusy(true);
    setError(null);
    try {
      await api.createWealthProduct({
        name, asset, type,
        annual_rate: parseFloat(annualRate),
        duration_days: parseInt(durationDays) || 0,
        min_amount: parseFloat(minAmount),
      });
      setShowForm(false);
      setForm({ name: "", asset: "USDT", type: "current", annualRate: "", durationDays: "0", minAmount: "" });
      load("products");
    } catch (e: any) {
      setError(e?.message ?? t("common.submitFailed"));
    } finally {
      setFormBusy(false);
    }
  };

  const handleAccrue = async () => {
    setAccruing(true);
    try {
      await api.accrueWealth();
      load("holdings");
    } catch (e: any) {
      setError(e?.message ?? t("common.actionFailed"));
    } finally {
      setAccruing(false);
    }
  };

  const typeLabel = (v: string) => v === "fixed" ? t("wealth.typeFixed") : t("wealth.typeCurrent");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("wealth.title")}</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        {(["products", "holdings"] as Tab[]).map((tb) => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${tab === tb ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}
          >
            {tb === "products" ? t("wealth.tabProducts") : t("wealth.tabHoldings")}
          </button>
        ))}
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {tab === "products" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setShowForm(true)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              {t("wealth.createProduct")}
            </Button>
          </div>
          <ApiTable
            title={t("wealth.tabProducts")}
            rows={products}
            loading={loading}
            onReload={() => load("products")}
            columns={[
              { key: "id", label: "ID", render: (r: any) => <span className="num">{r.id}</span> },
              { key: "name", label: t("wealth.name"), render: (r: any) => <span>{r.name}</span> },
              { key: "asset", label: t("col.asset"), render: (r: any) => <span className="font-mono text-xs">{r.asset}</span> },
              { key: "type", label: t("wealth.type"), render: (r: any) => <span className="text-xs">{typeLabel(r.type)}</span> },
              { key: "annual_rate", label: t("wealth.annualRate"), render: (r: any) => <span className="num text-success">{(r.annual_rate * 100).toFixed(2)}%</span> },
              { key: "duration_days", label: t("wealth.duration"), render: (r: any) => <span>{r.duration_days === 0 ? t("wealth.flexible") : `${r.duration_days}${t("wealth.durationSuf")}`}</span> },
              { key: "min_amount", label: t("wealth.minAmount"), render: (r: any) => <span className="num">{r.min_amount}</span> },
              { key: "status", label: t("wealth.status"), render: (r: any) => (
                <span className={`text-xs ${r.status === "open" ? "text-success" : "text-muted-foreground"}`}>
                  {r.status === "open" ? t("wealth.open") : t("wealth.closed")}
                </span>
              )},
            ]}
          />
        </div>
      )}

      {tab === "holdings" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={handleAccrue} disabled={accruing} className="gap-1.5">
              {accruing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("wealth.accrue")}
            </Button>
          </div>
          <ApiTable
            title={t("wealth.tabHoldings")}
            rows={holdings}
            loading={loading}
            onReload={() => load("holdings")}
            columns={[
              { key: "id", label: "ID", render: (r: any) => <span className="num">{r.id}</span> },
              { key: "user_id", label: t("col.userId"), render: (r: any) => <span className="num">{r.user_id}</span> },
              { key: "product_id", label: t("wealth.productId"), render: (r: any) => <span className="num">{r.product_id}</span> },
              { key: "asset", label: t("col.asset"), render: (r: any) => <span className="font-mono text-xs">{r.asset}</span> },
              { key: "principal", label: t("wealth.principal"), render: (r: any) => <span className="num">{r.principal}</span> },
              { key: "accrued_yield", label: t("wealth.accruedYield"), render: (r: any) => <span className="num text-success">{r.accrued_yield ?? "0"}</span> },
              { key: "status", label: t("wealth.holdingStatus"), render: (r: any) => (
                <span className={`text-xs ${r.status === "active" ? "text-success" : "text-muted-foreground"}`}>
                  {r.status === "active" ? t("wealth.statusActive") : r.status}
                </span>
              )},
              { key: "created_at", label: t("col.time"), render: (r: any) => <span className="num text-muted-foreground text-xs">{new Date(r.created_at).toLocaleString()}</span> },
            ]}
          />
        </div>
      )}

      {/* 创建产品弹窗 */}
      <Modal open={showForm} title={t("wealth.createProduct")} onClose={() => setShowForm(false)} size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            <Button onClick={handleSubmit} disabled={formBusy} className="gap-1.5">
              {formBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("wealth.createProduct")}
            </Button>
          </>
        }
      >
        <div className="space-y-3 text-sm">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t("wealth.name")} *</label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("wealth.namePh")} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("col.asset")}</label>
              <Select value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })}>
                {["USDT", "USDC", "BTC", "ETH"].map((a) => <option key={a} value={a}>{a}</option>)}
              </Select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("wealth.type")}</label>
              <Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option value="current">{t("wealth.typeCurrent")}</option>
                <option value="fixed">{t("wealth.typeFixed")}</option>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("wealth.annualRate")} (%)</label>
              <Input type="number" step="0.01" value={form.annualRate} onChange={(e) => setForm({ ...form, annualRate: e.target.value })} placeholder="5.00" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">{t("wealth.duration")}</label>
              <Input type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} placeholder={t("wealth.flexible")} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">{t("wealth.minAmount")}</label>
            <Input type="number" step="0.01" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} placeholder="100" />
          </div>
        </div>
      </Modal>
    </div>
  );
}
