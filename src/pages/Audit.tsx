import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";
import { useAuth, hasPerm } from "../lib/auth";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";

function fmtTime(ts?: number): string {
  return formatDateTime(ts);
}

export function Audit() {
  const { t } = useI18n();
  const { perms } = useAuth();
  const canRead = hasPerm(perms, "audit:read");

  const [limit, setLimit] = useState("50");

  const { data, loading, error, reload } = useFetch(() =>
    api.listAuditLogs({ limit: parseInt(limit, 10) || 50 }),
  );
  const logs = (data ?? []) as any[];

  if (!canRead) {
    return (
      <div className="page">
        <h1>{t('audit.title')}</h1>
        <div className="alert-error">{t('audit.noPerm')}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{t('audit.title')}</h1>
      <div className="inline-form">
        <label className="ann-active">{t('audit.perPage')}</label>
        <select value={limit} onChange={(e) => setLimit(e.target.value)}>
          {["20", "50", "100", "200"].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
        <button className="btn" onClick={reload}>
          {t('common.refresh')}
        </button>
      </div>

      <ApiTable
        title={t('audit.listTitle')}
        rows={logs}
        loading={loading}
        error={error}
        onReload={reload}
        columns={[
          { key: "time", label: t('col.time'), render: (r: any) => fmtTime(r.time) },
          { key: "admin_id", label: t('col.adminId') },
          {
            key: "action",
            label: t('col.action'),
            render: (r: any) => (
              <span className={`ann-badge ${actionClass(r.action)}`}>{r.action || r.method}</span>
            ),
          },
          { key: "method", label: t('col.method') },
          { key: "path", label: t('col.route') },
          { key: "target", label: t('col.target') },
          {
            key: "status",
            label: t('col.status'),
            render: (r: any) => (
              <span className={r.status >= 200 && r.status < 300 ? "ann-state on" : "ann-state off"}>
                {r.status}
              </span>
            ),
          },
          { key: "ip", label: "IP" },
        ]}
      />
    </div>
  );
}

function actionClass(action?: string): string {
  switch (action) {
    case "create":
      return "info";
    case "update":
      return "warning";
    case "delete":
      return "maintenance";
    default:
      return "info";
  }
}
