import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ApiTable } from "../components/ApiTable";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Card, CardContent } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { StatusBadge, type StatusTone } from "../components/ui/status-badge";

type Tab = "pools" | "lends" | "borrows";

export function LendingAdmin() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("pools");
  const [statusFilter, setStatusFilter] = useState("");

  const [pools, setPools] = useState<any[]>([]);
  const [lends, setLends] = useState<any[]>([]);
  const [borrows, setBorrows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formAsset, setFormAsset] = useState("");
  const [formCollateral, setFormCollateral] = useState("1.5");
  const [formBusy, setFormBusy] = useState(false);

  const load = async (target?: Tab) => {
    const cur = target ?? tab;
    if (target) setTab(target);
    setLoading(true);
    setError(null);
    try {
      if (cur === "pools") {
        const d = await api.listLendingPools();
        setPools(d.pools ?? []);
      } else if (cur === "lends") {
        const d = await api.listLendingLends();
        setLends(d.lends ?? []);
      } else {
        const d = await api.listLendingBorrows();
        setBorrows(d.borrows ?? []);
      }
    } catch (e: any) {
      setError(e?.message ?? t("common.queryFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusLabel = (s: string) => {
    const m: Record<string, string> = {
      active: t("lending.stActive"),
      withdrawn: t("lending.stWithdrawn"),
      repaid: t("lending.stRepaid"),
      cancelled: t("lending.stCancelled"),
      liquidated: t("lending.stLiquidated"),
      paused: t("lending.stPaused"),
      closed: t("lending.stClosed"),
    };
    return m[s] ?? s;
  };

  const statusTone = (s: string): StatusTone => {
    switch (s) {
      case "active":
        return "success";
      case "repaid":
        return "success";
      case "withdrawn":
        return "danger";
      case "liquidated":
        return "danger";
      case "cancelled":
        return "neutral";
      case "closed":
        return "neutral";
      case "paused":
        return "warning";
      default:
        return "neutral";
    }
  };

  const filterByStatus = (rows: any[]) =>
    statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;

  const handleCreatePool = async () => {
    if (!formAsset.trim()) return;
    setFormBusy(true);
    setError(null);
    try {
      await api.createLendingPool(formAsset.trim(), parseFloat(formCollateral) || 1.5);
      setShowForm(false);
      setFormAsset("");
      setFormCollateral("1.5");
      await load("pools");
    } catch (e: any) {
      setError(e?.message ?? t("lending.poolCreateFailed"));
    } finally {
      setFormBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="mb-3 text-lg font-semibold">{t("lending.title")}</h1>

      <div className="mb-3 flex gap-1.5">
        {(["pools", "lends", "borrows"] as Tab[]).map((key) => (
          <Button
            key={key}
            size="sm"
            variant={tab === key ? "default" : "outline"}
            onClick={() => { setTab(key); setStatusFilter(""); load(key); }}
          >
            {t(`lending.${key === "pools" ? "poolsTitle" : key === "lends" ? "lendsTitle" : "borrowsTitle"}`)}
          </Button>
        ))}
      </div>
      <div className="mb-3 flex items-center gap-2">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t("common.allStatus")}</option>
          {tab === "pools" && (
            <>
              <option value="active">{statusLabel("active")}</option>
              <option value="paused">{statusLabel("paused")}</option>
              <option value="closed">{statusLabel("closed")}</option>
            </>
          )}
          {tab === "lends" && (
            <>
              <option value="active">{statusLabel("active")}</option>
              <option value="withdrawn">{statusLabel("withdrawn")}</option>
            </>
          )}
          {tab === "borrows" && (
            <>
              <option value="active">{statusLabel("active")}</option>
              <option value="repaid">{statusLabel("repaid")}</option>
              <option value="liquidated">{statusLabel("liquidated")}</option>
            </>
          )}
        </Select>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {tab === "pools" && (
        <>
          {!showForm ? (
            <Button className="mb-3" onClick={() => setShowForm(true)}>
              {t("lending.createPool")}
            </Button>
          ) : (
            <Card className="mb-3">
              <CardContent className="flex flex-wrap items-center gap-2">
                <Input
                  className="w-[120px]"
                  placeholder={t("lending.poolAssetPlaceholder")}
                  value={formAsset}
                  onChange={(e) => setFormAsset(e.target.value)}
                />
                <Input
                  className="w-[140px]"
                  placeholder={t("lending.poolCollateralPlaceholder")}
                  value={formCollateral}
                  onChange={(e) => setFormCollateral(e.target.value)}
                  type="number"
                  step="0.1"
                  min="1.0"
                />
                <Button onClick={handleCreatePool} disabled={formBusy || !formAsset.trim()}>
                  {formBusy ? "..." : t("lending.createPool")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setShowForm(false); setFormAsset(""); setFormCollateral("1.5"); }}
                >
                  {t("common.cancel")}
                </Button>
              </CardContent>
            </Card>
          )}
          <ApiTable
            title={t("lending.poolsTitle")}
            rows={filterByStatus(pools)}
            loading={loading}
            error={error}
            onReload={() => load()}
            emptyText={t("lending.noPools")}
            columns={[
              { key: "id", label: "ID", render: (row: any) => <span className="num">{row.id}</span> },
              { key: "asset", label: t("lending.asset") },
              { key: "total_supply", label: t("lending.totalSupply"), render: (row: any) => <span className="num">{row.total_supply}</span> },
              { key: "total_borrow", label: t("lending.totalBorrow"), render: (row: any) => <span className="num">{row.total_borrow}</span> },
              { key: "available", label: t("lending.available"), render: (row: any) => <span className="num">{row.available}</span> },
              {
                key: "interest_rate",
                label: t("lending.interestRate"),
                render: (row: any) =>
                  row.interest_rate != null ? <span className="num">{(row.interest_rate * 100).toFixed(2)}%</span> : "-",
              },
              {
                key: "collateral_req",
                label: t("lending.collateralReq"),
                render: (row: any) =>
                  row.collateral_req != null ? <span className="num">{(row.collateral_req * 100).toFixed(0)}%</span> : "-",
              },
              {
                key: "status",
                label: t("lending.status"),
                render: (row: any) => (
                  <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
                ),
              },
              { key: "created_at", label: t("lending.createdAt"), render: (row: any) => <span className="num">{row.created_at}</span> },
            ]}
          />
        </>
      )}

      {tab === "lends" && (
        <ApiTable
          title={t("lending.lendsTitle")}
          rows={filterByStatus(lends)}
          loading={loading}
          error={error}
          onReload={() => load()}
          emptyText={t("lending.noLends")}
          columns={[
            { key: "id", label: "ID", render: (row: any) => <span className="num">{row.id}</span> },
            { key: "user_id", label: t("lending.userId"), render: (row: any) => <span className="num">{row.user_id}</span> },
            { key: "pool_id", label: t("lending.poolId"), render: (row: any) => <span className="num">{row.pool_id}</span> },
            { key: "amount", label: t("lending.amount"), render: (row: any) => <span className="num">{row.amount}</span> },
            {
              key: "rate",
              label: t("lending.rate"),
              render: (row: any) =>
                row.rate != null ? <span className="num">{(row.rate * 100).toFixed(2)}%</span> : "-",
            },
            {
              key: "status",
              label: t("lending.orderStatus"),
              render: (row: any) => (
                <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
              ),
            },
            { key: "created_at", label: t("lending.createdAt"), render: (row: any) => <span className="num">{row.created_at}</span> },
          ]}
        />
      )}

      {tab === "borrows" && (
        <ApiTable
          title={t("lending.borrowsTitle")}
          rows={filterByStatus(borrows)}
          loading={loading}
          error={error}
          onReload={() => load()}
          emptyText={t("lending.noBorrows")}
          columns={[
            { key: "id", label: "ID", render: (row: any) => <span className="num">{row.id}</span> },
            { key: "user_id", label: t("lending.userId"), render: (row: any) => <span className="num">{row.user_id}</span> },
            { key: "pool_id", label: t("lending.poolId"), render: (row: any) => <span className="num">{row.pool_id}</span> },
            { key: "amount", label: t("lending.amount"), render: (row: any) => <span className="num">{row.amount}</span> },
            { key: "collateral", label: t("lending.collateral"), render: (row: any) => <span className="num">{row.collateral}</span> },
            {
              key: "rate",
              label: t("lending.rate"),
              render: (row: any) =>
                row.rate != null ? <span className="num">{(row.rate * 100).toFixed(2)}%</span> : "-",
            },
            { key: "interest_acc", label: t("lending.interestAcc"), render: (row: any) => <span className="num">{row.interest_acc}</span> },
            {
              key: "status",
              label: t("lending.orderStatus"),
              render: (row: any) => (
                <StatusBadge tone={statusTone(row.status)}>{statusLabel(row.status)}</StatusBadge>
              ),
            },
            { key: "created_at", label: t("lending.createdAt"), render: (row: any) => <span className="num">{row.created_at}</span> },
            { key: "repaid_at", label: t("lending.repaidAt"), render: (row: any) => <span className="num">{row.repaid_at}</span> },
          ]}
        />
      )}

      {tab === "pools" && (
        <p className="text-xs text-muted-foreground">{t("lending.poolsNote")}</p>
      )}
    </div>
  );
}
