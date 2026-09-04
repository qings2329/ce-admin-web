import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ApiTable } from "../components/ApiTable";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";
import { StatusBadge } from "../components/ui/status-badge";

function fmtTime(ts: number | string | undefined): string {
  if (!ts) return "—";
  return new Date(Number(ts)).toLocaleString();
}

export function CopyTradeAdmin() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"leads" | "follows" | "copies">("leads");

  // Leads
  const [leads, setLeads] = useState<any[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsErr, setLeadsErr] = useState<string | null>(null);

  // Follows
  const [follows, setFollows] = useState<any[]>([]);
  const [followsLoading, setFollowsLoading] = useState(false);
  const [followsErr, setFollowsErr] = useState<string | null>(null);

  // Copies
  const [copies, setCopies] = useState<any[]>([]);
  const [copiesLoading, setCopiesLoading] = useState(false);
  const [copiesErr, setCopiesErr] = useState<string | null>(null);

  // Reconcile
  const [reconcile, setReconcile] = useState<{ balanced: boolean; deviation: Record<string, number> } | null>(null);
  const [reconcileErr, setReconcileErr] = useState<string | null>(null);

  const loadLeads = async () => {
    setLeadsLoading(true);
    setLeadsErr(null);
    try {
      const d = await api.listCopyLeads();
      setLeads(d.leads ?? []);
    } catch (e: any) {
      setLeadsErr(e?.message ?? t("common.queryFailed"));
    } finally {
      setLeadsLoading(false);
    }
  };

  const loadFollows = async () => {
    setFollowsLoading(true);
    setFollowsErr(null);
    try {
      const d = await api.listCopyFollows();
      setFollows(d.follows ?? []);
    } catch (e: any) {
      setFollowsErr(e?.message ?? t("common.queryFailed"));
    } finally {
      setFollowsLoading(false);
    }
  };

  const loadCopies = async () => {
    setCopiesLoading(true);
    setCopiesErr(null);
    try {
      const d = await api.listCopyCopies();
      setCopies(d.copies ?? []);
    } catch (e: any) {
      setCopiesErr(e?.message ?? t("common.queryFailed"));
    } finally {
      setCopiesLoading(false);
    }
  };

  const loadReconcile = async () => {
    setReconcileErr(null);
    try {
      setReconcile(await api.copyReconcile());
    } catch (e: any) {
      setReconcileErr(e?.message ?? t("common.queryFailed"));
    }
  };

  useEffect(() => { loadLeads(); }, []);

  const statusLabel = (s: string) => {
    const m: Record<string, string> = {
      active: t("copytrade.stActive"),
      stopped: t("copytrade.stStopped"),
      done: t("copytrade.copyDone"),
      failed: t("copytrade.copyFailed"),
      closed: t("copytrade.leadClosed"),
    };
    return m[s] ?? s;
  };

  const statusTone = (s: string) => {
    if (s === "active" || s === "done") return "success" as const;
    if (s === "stopped" || s === "failed") return "danger" as const;
    return "neutral" as const;
  };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">{t("copytrade.adminTitle")}</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {([
          { key: "leads" as const, label: t("copytrade.tabLeads") },
          { key: "follows" as const, label: t("copytrade.tabMyFollows") },
          { key: "copies" as const, label: t("copytrade.tabMyCopies") },
        ]).map((tabDef) => (
          <button
            key={tabDef.key}
            onClick={() => {
              setTab(tabDef.key);
              if (tabDef.key === "follows") loadFollows();
              if (tabDef.key === "copies") loadCopies();
            }}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              tab === tabDef.key
                ? "bg-primary/15 text-primary font-semibold"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tabDef.label}
          </button>
        ))}
      </div>

      {/* Leads */}
      {tab === "leads" && (
        <div className="space-y-2">
          {leadsErr && <Alert variant="error">{leadsErr}</Alert>}
          <ApiTable
            title={t("copytrade.adminLeadsTitle")}
            rows={leads}
            loading={leadsLoading}
            onReload={loadLeads}
            columns={[
              { key: "id", label: "ID", render: (r: any) => <span className="num">{r.id}</span> },
              { key: "name", label: t("copytrade.colName") },
              { key: "bio", label: t("copytrade.colBio") },
              {
                key: "status",
                label: t("col.status"),
                render: (r: any) => (
                  <StatusBadge tone={r.status === "active" ? "success" : "neutral"}>
                    {statusLabel(r.status)}
                  </StatusBadge>
                ),
              },
              {
                key: "created_at",
                label: t("col.time"),
                render: (r: any) => <span className="num text-muted-foreground text-xs">{fmtTime(r.created_at)}</span>,
              },
            ]}
          />
        </div>
      )}

      {/* Follows */}
      {tab === "follows" && (
        <div className="space-y-2">
          {followsErr && <Alert variant="error">{followsErr}</Alert>}
          <ApiTable
            title={t("copytrade.adminFollowsTitle")}
            rows={follows}
            loading={followsLoading}
            onReload={loadFollows}
            columns={[
              { key: "id", label: "ID", render: (r: any) => <span className="num">{r.id}</span> },
              { key: "lead_id", label: t("copytrade.colLead"), render: (r: any) => <span className="num">{r.lead_id}</span> },
              { key: "follower_id", label: t("col.userId"), render: (r: any) => <span className="num">{r.follower_id}</span> },
              { key: "copy_ratio", label: t("copytrade.colRatio"), render: (r: any) => <span>{r.copy_ratio}x</span> },
              {
                key: "allocated_amount",
                label: t("copytrade.colAllocated"),
                render: (r: any) => <span className="num">${(r.allocated_amount ?? 0).toFixed(2)}</span>,
              },
              {
                key: "status",
                label: t("col.status"),
                render: (r: any) => (
                  <StatusBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusBadge>
                ),
              },
              {
                key: "created_at",
                label: t("col.time"),
                render: (r: any) => <span className="num text-muted-foreground text-xs">{fmtTime(r.created_at)}</span>,
              },
            ]}
          />
        </div>
      )}

      {/* Copies */}
      {tab === "copies" && (
        <div className="space-y-2">
          {copiesErr && <Alert variant="error">{copiesErr}</Alert>}
          <ApiTable
            title={t("copytrade.adminCopiesTitle")}
            rows={copies}
            loading={copiesLoading}
            onReload={loadCopies}
            columns={[
              { key: "id", label: "ID", render: (r: any) => <span className="num">{r.id}</span> },
              { key: "lead_id", label: t("copytrade.colLead"), render: (r: any) => <span className="num">{r.lead_id}</span> },
              { key: "follow_id", label: "FollowID", render: (r: any) => <span className="num">{r.follow_id}</span> },
              { key: "symbol", label: t("col.symbol") },
              {
                key: "side",
                label: t("col.side"),
                render: (r: any) => (
                  <span style={{ color: r.side === "buy" ? "var(--success)" : "var(--destructive)" }}>
                    {r.side}
                  </span>
                ),
              },
              { key: "price", label: t("col.price"), render: (r: any) => <span className="num">{r.price}</span> },
              { key: "qty", label: t("col.qty"), render: (r: any) => <span className="num">{r.qty}</span> },
              {
                key: "notional",
                label: t("copytrade.colNotional"),
                render: (r: any) => <span className="num">${(r.notional ?? 0).toFixed(2)}</span>,
              },
              {
                key: "status",
                label: t("col.status"),
                render: (r: any) => (
                  <StatusBadge tone={statusTone(r.status)}>{statusLabel(r.status)}</StatusBadge>
                ),
              },
              {
                key: "created_at",
                label: t("col.time"),
                render: (r: any) => <span className="num text-muted-foreground text-xs">{fmtTime(r.created_at)}</span>,
              },
            ]}
          />
        </div>
      )}

      {/* Reconcile */}
      <div className="flex items-center gap-2 pt-2">
        <Button size="sm" variant="outline" onClick={loadReconcile}>
          {t("copytrade.reconcile")}
        </Button>
        {reconcile && (
          <span className={`text-xs ${reconcile.balanced ? "text-success" : "text-destructive"}`}>
            {reconcile.balanced ? t("copytrade.reconcileOk") : t("copytrade.reconcileBad")}
          </span>
        )}
        {reconcileErr && <span className="text-xs text-destructive">{reconcileErr}</span>}
      </div>
    </div>
  );
}
