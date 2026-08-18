import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useAuth, hasPerm } from "../lib/auth";
import { useI18n } from "../i18n";

export function Admins() {
  const { t } = useI18n();
  const { perms } = useAuth();
  const canManage = hasPerm(perms, "admin:manage");
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) => api.listAdmins(p));
  const rolesFetch = useFetch(api.listRoles);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [editTarget, setEditTarget] = useState<{ id: number; roleId: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const roles = (rolesFetch.data?.items ?? []) as any[];

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (roleId === "") {
      setMsg(t('admins.pleaseSelectRole'));
      return;
    }
    try {
      await api.createAdmin({ username, password, role_id: Number(roleId) });
      setUsername("");
      setPassword("");
      setRoleId("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    }
  };

  const activate = async (id: number) => {
    try {
      await api.activateAdmin(id);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    }
  };
  const disable = async (id: number) => {
    try {
      await api.disableAdmin(id);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    }
  };
  const reset = async (id: number) => {
    const pw = window.prompt(t('admins.pwdPrompt'));
    if (!pw) return;
    try {
      await api.resetAdminPassword(id, pw);
      setMsg(t('admins.pwdResetDone'));
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    }
  };

  // 改派已有管理员的角色（后端 updateAdmin 支持 role_id 改派）。
  const saveRole = async () => {
    if (!editTarget) return;
    setMsg(null);
    try {
      await api.updateAdmin(editTarget.id, { role_id: Number(editTarget.roleId) });
      setMsg(t('admins.roleUpdated'));
      setEditTarget(null);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    }
  };

  if (!canManage) {
    return (
      <div className="page">
        <h1>{t('admins.title')}</h1>
        <div className="alert-error">{t('admins.noPerm')}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{t('admins.title')}</h1>
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder={t('admins.usernamePh')} value={username} onChange={(e) => setUsername(e.target.value)} />
        <input
          placeholder={t('admins.initPwdPh')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          <option value="">{t('admins.selectRole')}</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          {t('admins.create')}
        </button>
        <span className="muted">{t('admins.pendingHint')}</span>
      </form>

      <ApiTable
        title={t('admins.listTitle')}
        rows={items}
        loading={loading}
        error={error}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: "ID" },
          { key: "username", label: t('col.username') },
          { key: "status", label: t('col.status') },
          { key: "role_name", label: t('col.role') },
          {
            key: "totp_enabled",
            label: "MFA",
            render: (row: any) => (row.totp_enabled ? t('common.enabled') : t('common.disabled')),
          },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <>
                {row.status !== "active" && (
                  <button className="btn" onClick={() => activate(row.id)}>
                    {t('admins.activate')}
                  </button>
                )}
                {row.status === "active" && (
                  <button className="btn" onClick={() => disable(row.id)}>
                    {t('admins.disable')}
                  </button>
                )}
                <button className="btn" onClick={() => reset(row.id)}>
                  {t('admins.resetPwd')}
                </button>
                <button
                  className="btn"
                  onClick={() => setEditTarget({ id: row.id, roleId: String(row.role_id ?? "") })}
                >
                  {t('admins.changeRole')}
                </button>
              </>
            ),
          },
        ]}
      />

      {editTarget != null && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>{t('admins.editTitle', { id: editTarget.id })}</h2>
              <button className="btn" onClick={() => setEditTarget(null)}>
                {t('common.close')}
              </button>
            </div>
            <div className="inline-form">
              <select
                value={editTarget.roleId}
                onChange={(e) => setEditTarget({ ...editTarget, roleId: e.target.value })}
              >
                <option value="">{t('admins.selectRole')}</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <button className="btn" disabled={!editTarget.roleId} onClick={saveRole}>
                {t('admins.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
