import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
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
import { DestructiveActionGuard } from "../components/ui/DestructiveActionGuard";
import { PasswordField } from "../components/ui/PasswordField";

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
  const [resetTarget, setResetTarget] = useState<{ id: number; username: string } | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [resetting, setResetting] = useState(false);

  const roles = (rolesFetch.data?.items ?? []) as any[];

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!username.trim()) {
      setMsg(t('admins.usernameRequired'));
      return;
    }
    if (!password) {
      setMsg(t('admins.pwdRequired'));
      return;
    }
    if (roleId === "") {
      setMsg(t('admins.pleaseSelectRole'));
      return;
    }
    setCreating(true);
    try {
      await api.createAdmin({ username, password, role_id: Number(roleId) });
      setUsername("");
      setPassword("");
      setRoleId("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    } finally {
      setCreating(false);
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
  const doResetPwd = async () => {
    if (!resetTarget || !resetPwd) return;
    setResetting(true);
    setMsg(null);
    try {
      await api.resetAdminPassword(resetTarget.id, resetPwd);
      setMsg(t('admins.pwdResetDone'));
      setResetTarget(null);
      setResetPwd("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    } finally {
      setResetting(false);
    }
  };

  const saveRole = async () => {
    if (!editTarget) return;
    setMsg(null);
    setSavingRole(true);
    try {
      await api.updateAdmin(editTarget.id, { role_id: Number(editTarget.roleId) });
      setMsg(t('admins.roleUpdated'));
      setEditTarget(null);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    } finally {
      setSavingRole(false);
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
        <Button type="submit" disabled={creating} className="gap-1.5">
          {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t('admins.create')}
        </Button>
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
                  <DestructiveActionGuard
                    confirmText={String(row.username || row.id)}
                    confirmLabel={t('admins.disable')}
                    onConfirm={async () => {
                      await disable(row.id);
                    }}
                    trigger={
                      <Button variant="destructive" className="border-dashed">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('admins.disable')}
                      </Button>
                    }
                  />
                )}
                <Button variant="outline" onClick={() => setResetTarget({ id: row.id, username: row.username })}>
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

      {/* 改派角色弹窗 */}
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
              <Button disabled={!editTarget.roleId || savingRole} onClick={saveRole} className="gap-1.5">
                {savingRole && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t('admins.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 重置密码弹窗 */}
      {resetTarget != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/55"
          onClick={() => setResetTarget(null)}
        >
          <div
            className="rounded-xl border border-border bg-card p-4 w-[min(480px,92vw)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold">{t('admins.resetPwdTitle', { username: resetTarget.username })}</h2>
              <Button variant="ghost" onClick={() => setResetTarget(null)}>
                {t('common.close')}
              </Button>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{t('admins.resetPwdHint')}</p>
              <PasswordField
                label={t('settings.newPwd')}
                placeholder={t('admins.newPwdPh')}
                value={resetPwd}
                onChange={(e) => setResetPwd(e.target.value)}
                showStrength
                disabled={resetting}
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetting}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={doResetPwd}
                  disabled={resetting || !resetPwd}
                  className="gap-1.5"
                >
                  {resetting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t('admins.resetPwd')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
