import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useAuth, hasPerm } from "../lib/auth";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { StatusBadge } from "../components/ui/status-badge";
import { DestructiveActionGuard } from "../components/ui/DestructiveActionGuard";
import { Alert } from "../components/ui/alert";
import { CopyButton } from "../components/ui/CopyButton";
import { Loader2 } from "lucide-react";

function fmtTime(t: any): string {
  return formatDateTime(t);
}

export function ApiKeys() {
  const { perms } = useAuth();
  const { t } = useI18n();
  const canRead = hasPerm(perms, "apikey:view");
  const canManage = hasPerm(perms, "apikey:manage");

  const [userId, setUserId] = useState("");
  const [queryUserId, setQueryUserId] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  const keysFetch = usePaged((p) =>
    api.listApiKeys({ ...(queryUserId ? { user_id: queryUserId } : {}), limit: p.limit, offset: p.offset })
  );

  // 创建弹窗
  const [showCreate, setShowCreate] = useState(false);
  const [newUserId, setNewUserId] = useState("");
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const keys = (keysFetch.items ?? []) as any[];

  const runQuery = () => {
    setQueryUserId(userId);
    keysFetch.changePage(1);
  };

  const openCreate = () => {
    setNewUserId("");
    setLabel("");
    setScopes("");
    setCreatedKey(null);
    setMsg(null);
    setShowCreate(true);
  };

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const uid = Number(newUserId);
    if (!uid || !label) {
      setMsg(t('apikeys.pleaseFill'));
      return;
    }
    const permsList = scopes
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setCreating(true);
    try {
      const res = await api.createApiKey({ user_id: uid, label, permissions: permsList });
      setCreatedKey(res.key); // 明文仅此一次，提示用户立即保存
      setShowCreate(false);
      keysFetch.reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('apikeys.issueFailed'));
    } finally {
      setCreating(false);
    }
  };

  const revoke = async (id: number) => {
    setMsg(null);
    try {
      await api.revokeApiKey(id);
      keysFetch.reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('apikeys.revokeFailed'));
    }
  };

  if (!canRead) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">{t('apikeys.title')}</h1>
        <Alert variant="error">{t('apikeys.noPerm')}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{t('apikeys.title')}</h1>
      {msg && <Alert variant="info">{msg}</Alert>}

      <form
        className="flex flex-wrap items-center gap-2 mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          runQuery();
        }}
      >
        <Input
          placeholder={t('apikeys.userIdPh')} className="max-w-xs"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <Button type="submit">{t('apikeys.query')}</Button>
        {canManage && (
          <Button type="button" variant="outline" onClick={openCreate}>
            {t('apikeys.issue')}
          </Button>
        )}
      </form>

      <ApiTable
        title={t('apikeys.listTitle')}
        rows={keys}
        loading={keysFetch.loading}
        error={keysFetch.error}
        onReload={keysFetch.reload}
        actions={
          <Pager
            total={keysFetch.total}
            limit={keysFetch.limit}
            page={keysFetch.page}
            onChange={keysFetch.changePage}
            onLimitChange={keysFetch.changeLimit}
          />
        }
        columns={[
          { key: "id", label: "ID", render: (row: any) => <span className="num">{row.id}</span> },
          { key: "user_id", label: t('col.userId'), render: (row: any) => <span className="num">{row.user_id}</span> },
          { key: "label", label: t('col.label') },
          { key: "prefix", label: t('col.prefix'), render: (row: any) => <span className="num">{row.prefix}</span> },
          {
            key: "permissions",
            label: t('col.scope'),
            render: (row: any) => (
              <span className="num">
                {(row.permissions ?? []).length ? (row.permissions as string[]).join(", ") : "—"}
              </span>
            ),
          },
          {
            key: "status",
            label: t('col.status'),
            render: (row: any) =>
              row.status === "active" ? (
                <StatusBadge tone="success">{t('common.valid')}</StatusBadge>
              ) : (
                <StatusBadge tone="danger">{t('common.revoked')}</StatusBadge>
              ),
          },
          { key: "created_at", label: t('col.createdAt'), render: (row: any) => fmtTime(row.created_at) },
          {
            key: "revoked_at",
            label: t('col.revokeTime'),
            render: (row: any) => fmtTime(row.revoked_at),
          },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) =>
              row.status === "active" && canManage ? (
                <DestructiveActionGuard
                  confirmText={String(row.label || row.prefix || row.id)}
                  confirmLabel={t('apikeys.revoke')}
                  onConfirm={async () => {
                    await revoke(row.id);
                  }}
                  trigger={
                    <Button className="border-dashed">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('apikeys.revoke')}
                    </Button>
                  }
                />
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              ),
          },
        ]}
      />

      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55"
          onClick={() => setShowCreate(false)}
        >
          <div
            className="rounded-xl border border-border bg-card p-4 w-[min(560px,92vw)] max-h-[86vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{t('apikeys.issueTitle')}</h2>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                {t('common.close')}
              </Button>
            </div>
            <form className="flex flex-wrap items-center gap-2" onSubmit={submitCreate}>
              <Input
                placeholder={t('apikeys.userIdPh2')}
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
              />
              <Input
                placeholder={t('apikeys.labelPh')}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <Input
                placeholder={t('apikeys.scopePh')}
                value={scopes}
                onChange={(e) => setScopes(e.target.value)}
              />
              <Button type="submit" disabled={creating} className="gap-1.5">
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {creating ? t('apikeys.issuing') : t('apikeys.issueBtn')}
              </Button>
            </form>
          </div>
        </div>
      )}

      {createdKey != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55"
          onClick={() => setCreatedKey(null)}
        >
          <div
            className="rounded-xl border border-border bg-card p-4 w-[min(560px,92vw)] max-h-[86vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{t('apikeys.issuedTitle')}</h2>
              <Button variant="ghost" onClick={() => setCreatedKey(null)}>
                {t('apikeys.saved')}
              </Button>
            </div>
            <Alert variant="warn">{t('apikeys.plaintextHint')}</Alert>
            <div className="flex items-start gap-2 rounded-md border border-border bg-background p-3">
              <pre className="flex-1 font-mono text-xs num whitespace-pre-wrap break-all">{createdKey}</pre>
              <CopyButton value={createdKey} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
