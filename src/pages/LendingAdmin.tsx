import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ApiTable } from "../components/ApiTable";
import { useI18n } from "../i18n";

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
    <div className="page">
      <h1>{t("lending.title")}</h1>

      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        {(["pools", "lends", "borrows"] as Tab[]).map((key) => (
          <button
            key={key}
            className="btn"
            style={tab === key ? { fontWeight: "bold" } : undefined}
            onClick={() => { setTab(key); setStatusFilter(""); load(key); }}
          >
            {t(`lending.${key === "pools" ? "poolsTitle" : key === "lends" ? "lendsTitle" : "borrowsTitle"}`)}
          </button>
        ))}
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
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
        </select>
      </div>

      {error && <div className="alert-error">{error}</div>}

      {tab === "pools" && (
        <>
          {!showForm ? (
            <button className="btn" style={{ marginBottom: 12 }} onClick={() => setShowForm(true)}>
              {t("lending.createPool")}
            </button>
          ) : (
            <div style={{ marginBottom: 12, padding: 12, border: "1px solid var(--border)", borderRadius: 6, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <input
                placeholder={t("lending.poolAssetPlaceholder")}
                value={formAsset}
                onChange={(e) => setFormAsset(e.target.value)}
                style={{ width: 120 }}
              />
              <input
                placeholder={t("lending.poolCollateralPlaceholder")}
                value={formCollateral}
                onChange={(e) => setFormCollateral(e.target.value)}
                style={{ width: 140 }}
                type="number"
                step="0.1"
                min="1.0"
              />
              <button className="btn" onClick={handleCreatePool} disabled={formBusy || !formAsset.trim()}>
                {formBusy ? "..." : t("lending.createPool")}
              </button>
              <button className="btn" onClick={() => { setShowForm(false); setFormAsset(""); setFormCollateral("1.5"); }}>
                {t("common.cancel")}
              </button>
            </div>
          )}
          <ApiTable
            title={t("lending.poolsTitle")}
            rows={filterByStatus(pools)}
            loading={loading}
            error={error}
            onReload={() => load()}
            emptyText={t("lending.noPools")}
            columns={[
              { key: "id", label: "ID" },
              { key: "asset", label: t("lending.asset") },
              { key: "total_supply", label: t("lending.totalSupply") },
              { key: "total_borrow", label: t("lending.totalBorrow") },
              { key: "available", label: t("lending.available") },
              {
                key: "interest_rate",
                label: t("lending.interestRate"),
                render: (row: any) =>
                  row.interest_rate != null ? `${(row.interest_rate * 100).toFixed(2)}%` : "-",
              },
              {
                key: "collateral_req",
                label: t("lending.collateralReq"),
                render: (row: any) =>
                  row.collateral_req != null ? `${(row.collateral_req * 100).toFixed(0)}%` : "-",
              },
              {
                key: "status",
                label: t("lending.status"),
                render: (row: any) => statusLabel(row.status),
              },
              { key: "created_at", label: t("lending.createdAt") },
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
            { key: "id", label: "ID" },
            { key: "user_id", label: t("lending.userId") },
            { key: "pool_id", label: t("lending.poolId") },
            { key: "amount", label: t("lending.amount") },
            {
              key: "rate",
              label: t("lending.rate"),
              render: (row: any) =>
                row.rate != null ? `${(row.rate * 100).toFixed(2)}%` : "-",
            },
            {
              key: "status",
              label: t("lending.orderStatus"),
              render: (row: any) => statusLabel(row.status),
            },
            { key: "created_at", label: t("lending.createdAt") },
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
            { key: "id", label: "ID" },
            { key: "user_id", label: t("lending.userId") },
            { key: "pool_id", label: t("lending.poolId") },
            { key: "amount", label: t("lending.amount") },
            { key: "collateral", label: t("lending.collateral") },
            {
              key: "rate",
              label: t("lending.rate"),
              render: (row: any) =>
                row.rate != null ? `${(row.rate * 100).toFixed(2)}%` : "-",
            },
            { key: "interest_acc", label: t("lending.interestAcc") },
            {
              key: "status",
              label: t("lending.orderStatus"),
              render: (row: any) => statusLabel(row.status),
            },
            { key: "created_at", label: t("lending.createdAt") },
            { key: "repaid_at", label: t("lending.repaidAt") },
          ]}
        />
      )}

      {tab === "pools" && (
        <p className="muted">{t("lending.poolsNote")}</p>
      )}
    </div>
  );
}
