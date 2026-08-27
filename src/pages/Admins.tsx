import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useAuth, hasPerm } from "../lib/auth";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { StatusBadge } from "../components/ui/status-badge";
import { Alert } from "../components/ui/alert";

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
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">{t('admins.title')}</h1>
        <Alert variant="error">{t('admins.noPerm')}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-semibold">{t('admins.title')}</h1>
      {msg && <Alert variant="info">{msg}</Alert>}

      <form className="flex flex-wrap items-center gap-2 mb-3" onSubmit={create}>
        <Input placeholder={t('admins.usernamePh')} value={username} onChange={(e) => setUsername(e.target.value)} />
        <Input
          placeholder={t('admins.initPwdPh')}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          <option value="">{t('admins.selectRole')}</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </Select>
        <Button type="submit">{t('admins.create')}</Button>
        <span className="text-xs text-muted-foreground">{t('admins.pendingHint')}</span>
      </form>

      <ApiTable
        title={t('admins.listTitle')}
        rows={items}
        loading={loading}
        error={error}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: "ID", render: (row: any) => <span className="num">{row.id}</span> },
          { key: "username", label: t('col.username') },
          {
            key: "status",
            label: t('col.status'),
            render: (row: any) => (
              <StatusBadge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</StatusBadge>
            ),
          },
          { key: "role_name", label: t('col.role') },
          {
            key: "totp_enabled",
            label: "MFA",
            render: (row: any) => (
              <StatusBadge tone={row.totp_enabled ? "success" : "neutral"}>
                {row.totp_enabled ? t('common.enabled') : t('common.disabled')}
              </StatusBadge>
            ),
          },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <div className="flex flex-wrap items-center gap-2">
                {row.status !== "active" && (
                  <Button onClick={() => activate(row.id)}>{t('admins.activate')}</Button>
                )}
                {row.status === "active" && (
                  <Button variant="destructive" onClick={() => disable(row.id)}>
                    {t('admins.disable')}
                  </Button>
                )}
                <Button variant="outline" onClick={() => reset(row.id)}>
                  {t('admins.resetPwd')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditTarget({ id: row.id, roleId: String(row.role_id ?? "") })}
                >
                  {t('admins.changeRole')}
                </Button>
              </div>
            ),
          },
        ]}
      />

      {editTarget != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55"
          onClick={() => setEditTarget(null)}
        >
          <div
            className="rounded-xl border border-border bg-card p-4 w-[min(560px,92vw)] max-h-[86vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{t('admins.editTitle', { id: editTarget.id })}</h2>
              <Button variant="ghost" onClick={() => setEditTarget(null)}>
                {t('common.close')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={editTarget.roleId}
                onChange={(e) => setEditTarget({ ...editTarget, roleId: e.target.value })}
              >
                <option value="">{t('admins.selectRole')}</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>
              <Button disabled={!editTarget.roleId} onClick={saveRole}>
                {t('admins.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
