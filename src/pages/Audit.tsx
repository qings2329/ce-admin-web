import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";
import { useAuth, hasPerm } from "../lib/auth";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Input } from "../components/ui/input";
import { StatusBadge, type StatusTone } from "../components/ui/status-badge";
import { Alert } from "../components/ui/alert";
import { MaskedText, maskIp } from "../lib/mask";

function fmtTime(ts?: number): string {
  return formatDateTime(ts);
}

// 审计动作 → 状态色（与遗留 .ann-badge 映射一致：info→success、warning→warning、maintenance→info）。
function actionTone(action?: string): StatusTone {
  switch (action) {
    case "create":
      return "success";
    case "update":
      return "warning";
    case "delete":
      return "info";
    default:
      return "success";
  }
}

export function Audit() {
  const { t } = useI18n();
  const { perms } = useAuth();
  const canRead = hasPerm(perms, "audit:view");

  const [limit, setLimit] = useState("50");
  const [action, setAction] = useState("");
  const [method, setMethod] = useState("");
  const [adminId, setAdminId] = useState("");
  const [keyword, setKeyword] = useState("");
  const [params, setParams] = useState<Record<string, any>>({});

  const { data, loading, error, reload } = useFetch(() =>
    api.listAuditLogs({ ...params, limit: parseInt(limit, 10) || 50 }),
  );

  const applyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    setParams({
      action: action || undefined,
      method: method || undefined,
      admin_id: adminId || undefined,
      keyword: keyword || undefined,
    });
    reload();
  }; // 接口返回 { logs, total }，需取 logs 数组（不能直接把 data 当数组传给表格）。
  const logs = ((data?.logs as any[]) ?? []) as any[];

  if (!canRead) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">{t('audit.title')}</h1>
        <Alert variant="error">{t('audit.noPerm')}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{t('audit.title')}</h1>
      <form className="mb-3 flex flex-wrap items-center gap-2" onSubmit={applyFilter}>
        <Select value={action} onChange={(e) => setAction(e.target.value)} className="max-w-[150px]">
          <option value="">{t('audit.actionAll')}</option>
          <option value="create">{t('audit.actionCreate')}</option>
          <option value="update">{t('audit.actionUpdate')}</option>
          <option value="delete">{t('audit.actionDelete')}</option>
          <option value="login">{t('audit.actionLogin')}</option>
        </Select>
        <Select value={method} onChange={(e) => setMethod(e.target.value)} className="max-w-[120px]">
          <option value="">{t('audit.methodAll')}</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </Select>
        <Input
          placeholder={t('audit.adminIdPh')} className="max-w-[120px]" value={adminId}
          onChange={(e) => setAdminId(e.target.value)} type="number"
        />
        <Input
          placeholder={t('audit.keywordPh')} className="max-w-[200px]" value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <Button type="submit">{t('common.query')}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => {
          setAction(""); setMethod(""); setAdminId(""); setKeyword("");
          setParams({}); reload();
        }}>
          ✕
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span className="text-xs text-muted-foreground">{t('audit.perPage')}</span>
        <Select value={limit} onChange={(e) => setLimit(e.target.value)}>
          {["20", "50", "100", "200"].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </Select>
        <Button onClick={reload}>{t('common.refresh')}</Button>
      </div>

      <ApiTable
        title={t('audit.listTitle')}
        rows={logs}
        loading={loading}
        error={error}
        onReload={reload}
        columns={[
          { key: "time", label: t('col.time'), render: (r: any) => fmtTime(r.time) },
          { key: "admin_id", label: t('col.adminId'), render: (r: any) => <span className="num">{r.admin_id}</span> },
          {
            key: "action",
            label: t('col.action'),
            render: (r: any) => (
              <StatusBadge tone={actionTone(r.action)}>{r.action || r.method}</StatusBadge>
            ),
          },
          { key: "method", label: t('col.method') },
          { key: "path", label: t('col.route') },
          { key: "target", label: t('col.target') },
          {
            key: "status",
            label: t('col.status'),
            render: (r: any) => (
              <StatusBadge tone={r.status >= 200 && r.status < 300 ? "success" : "neutral"}>
                <span className="num">{r.status}</span>
              </StatusBadge>
            ),
          },
          { key: "ip", label: "IP", render: (r: any) => <span className="num"><MaskedText value={r.ip} mask={maskIp} /></span> },
        ]}
      />
    </div>
  );
}
