import { useState } from "react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useAuth, hasPerm } from "../lib/auth";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";

function fmtTime(t: any): string {
  return formatDateTime(t);
}

export function ApiKeys() {
  const { perms } = useAuth();
  const { t } = useI18n();
  const canRead = hasPerm(perms, "apikey:read");
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
    if (!window.confirm(t('apikeys.revokeConfirm'))) return;
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
      <div className="page">
        <h1>{t('apikeys.title')}</h1>
        <div className="alert-error">{t('apikeys.noPerm')}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{t('apikeys.title')}</h1>
      {msg && <div className="alert-info">{msg}</div>}

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          runQuery();
        }}
      >
        <input
          placeholder={t('apikeys.userIdPh')}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button className="btn" type="submit">
          {t('apikeys.query')}
        </button>
        {canManage && (
          <button className="btn" type="button" onClick={openCreate}>
            {t('apikeys.issue')}
          </button>
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
          { key: "id", label: "ID" },
          { key: "user_id", label: t('col.userId') },
          { key: "label", label: t('col.label') },
          { key: "prefix", label: t('col.prefix') },
          {
            key: "permissions",
            label: t('col.scope'),
            render: (row: any) =>
              (row.permissions ?? []).length ? (row.permissions as string[]).join(", ") : "—",
          },
          {
            key: "status",
            label: t('col.status'),
            render: (row: any) =>
              row.status === "active" ? (
                <span className="badge-ok">{t('common.valid')}</span>
              ) : (
                <span className="badge-bad">{t('common.revoked')}</span>
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
                <button className="btn" onClick={() => revoke(row.id)}>
                  {t('apikeys.revoke')}
                </button>
              ) : (
                <span className="muted">—</span>
              ),
          },
        ]}
      />

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>{t('apikeys.issueTitle')}</h2>
              <button className="btn" onClick={() => setShowCreate(false)}>
                {t('common.close')}
              </button>
            </div>
            <form className="inline-form" onSubmit={submitCreate}>
              <input
                placeholder={t('apikeys.userIdPh2')}
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
              />
              <input
                placeholder={t('apikeys.labelPh')}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
              <input
                placeholder={t('apikeys.scopePh')}
                value={scopes}
                onChange={(e) => setScopes(e.target.value)}
              />
              <button className="btn" type="submit" disabled={creating}>
                {creating ? t('apikeys.issuing') : t('apikeys.issueBtn')}
              </button>
            </form>
          </div>
        </div>
      )}

      {createdKey != null && (
        <div className="modal-overlay" onClick={() => setCreatedKey(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>{t('apikeys.issuedTitle')}</h2>
              <button className="btn" onClick={() => setCreatedKey(null)}>
                {t('apikeys.saved')}
              </button>
            </div>
            <p className="alert-warn">
              {t('apikeys.plaintextHint')}
            </p>
            <pre className="key-secret">{createdKey}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
