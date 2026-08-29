import { useState } from "react";
import { Loader2 } from "lucide-react";
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
import { Modal } from "../components/ui/Modal";
import { AlertTriangle } from "lucide-react";

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
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<{ id: number; roleId: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<{ id: number; username: string } | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [resetting, setResetting] = useState(false);

  const roles = (rolesFetch.data?.items ?? []) as any[];

  const openCreate = () => {
    setUsername(""); setPassword(""); setRoleId(""); setMsg(null);
    setShowCreate(true);
  };

  const doCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    if (!username.trim()) { setMsg(t('admins.usernameRequired')); return; }
    if (!password) { setMsg(t('admins.pwdRequired')); return; }
    if (roleId === "") { setMsg(t('admins.pleaseSelectRole')); return; }
    setCreating(true);
    try {
      await api.createAdmin({ username, password, role_id: Number(roleId) });
      setShowCreate(false); reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    } finally { setCreating(false); }
  };

  const activate = async (id: number) => {
    try { await api.activateAdmin(id); reload(); }
    catch (e: any) { setMsg(e?.message ?? t('common.opFailed')); }
  };
  const disable = async (id: number) => {
    try { await api.disableAdmin(id); reload(); }
    catch (e: any) { setMsg(e?.message ?? t('common.opFailed')); }
  };
  const doResetPwd = async () => {
    if (!resetTarget || !resetPwd) return;
    setResetting(true); setMsg(null);
    try {
      await api.resetAdminPassword(resetTarget.id, resetPwd);
      setMsg(t('admins.pwdResetDone')); setResetTarget(null); setResetPwd(""); reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    } finally { setResetting(false); }
  };
  const saveRole = async () => {
    if (!editTarget) return;
    setMsg(null); setSavingRole(true);
    try {
      await api.updateAdmin(editTarget.id, { role_id: Number(editTarget.roleId) });
      setMsg(t('admins.roleUpdated')); setEditTarget(null); reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    } finally { setSavingRole(false); }
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
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('admins.title')}</h1>
        <Button onClick={openCreate} className="gap-1.5">{t('admins.create')}</Button>
      </div>
      {msg && <Alert variant="info">{msg}</Alert>}

      <ApiTable
        title={t('admins.listTitle')} rows={items} loading={loading} error={error} onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: "ID", render: (row: any) => <span className="num">{row.id}</span> },
          { key: "username", label: t('col.username') },
          { key: "status", label: t('col.status'), render: (row: any) => <StatusBadge tone={row.status === "active" ? "success" : "neutral"}>{row.status}</StatusBadge> },
          { key: "role_name", label: t('col.role') },
          { key: "totp_enabled", label: "MFA", render: (row: any) => <StatusBadge tone={row.totp_enabled ? "success" : "neutral"}>{row.totp_enabled ? t('common.enabled') : t('common.disabled')}</StatusBadge> },
          {
            key: "op", label: t('col.actions'),
            render: (row: any) => (
              <div className="flex flex-wrap items-center gap-2">
                {row.status !== "active" && <Button onClick={() => activate(row.id)}>{t('admins.activate')}</Button>}
                {row.status === "active" && (
                  <DestructiveActionGuard confirmText={String(row.username || row.id)} confirmLabel={t('admins.disable')}
                    onConfirm={async () => { await disable(row.id); }}
                    trigger={<Button variant="destructive" className="border-dashed"><AlertTriangle className="h-3.5 w-3.5" />{t('admins.disable')}</Button>} />
                )}
                <Button variant="outline" onClick={() => setResetTarget({ id: row.id, username: row.username })}>{t('admins.resetPwd')}</Button>
                <Button variant="outline" onClick={() => setEditTarget({ id: row.id, roleId: String(row.role_id ?? "") })}>{t('admins.changeRole')}</Button>
              </div>
            ),
          },
        ]}
      />

      <Modal open={showCreate} title={t('admins.create')} onClose={() => setShowCreate(false)}
        footer={<Button type="button" onClick={doCreate} disabled={creating} className="gap-1.5">
          {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t('admins.create')}
        </Button>}>
        <div className="space-y-3">
          <Input placeholder={t('admins.usernamePh')} value={username} onChange={(e) => setUsername(e.target.value)} disabled={creating} />
          <PasswordField label={t('admins.initPwdPh')} placeholder={t('admins.initPwdPh')} value={password} onChange={(e) => setPassword(e.target.value)} disabled={creating} showStrength />
          <Select value={roleId} onChange={(e) => setRoleId(e.target.value)} disabled={creating}>
            <option value="">{t('admins.selectRole')}</option>
            {roles.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </Select>
          <p className="text-xs text-muted-foreground">{t('admins.pendingHint')}</p>
        </div>
      </Modal>

      <Modal open={editTarget != null} title={editTarget ? t('admins.editTitle', { id: editTarget.id }) : ''} onClose={() => setEditTarget(null)}
        footer={<Button disabled={!editTarget?.roleId || savingRole} onClick={saveRole} className="gap-1.5">
          {savingRole && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t('admins.save')}
        </Button>}>
        <div className="space-y-3">
          <Select value={editTarget?.roleId ?? ""} onChange={(e) => setEditTarget({ ...editTarget!, roleId: e.target.value })} disabled={savingRole}>
            <option value="">{t('admins.selectRole')}</option>
            {roles.map((r) => (<option key={r.id} value={r.id}>{r.name}</option>))}
          </Select>
        </div>
      </Modal>

      <Modal open={resetTarget != null} title={resetTarget ? t('admins.resetPwdTitle', { username: resetTarget.username }) : ''} onClose={() => setResetTarget(null)}
        footer={<>
          <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetting}>{t('common.cancel')}</Button>
          <Button variant="destructive" onClick={doResetPwd} disabled={resetting || !resetPwd} className="gap-1.5">
            {resetting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('admins.resetPwd')}
          </Button>
        </>}>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('admins.resetPwdHint')}</p>
          <PasswordField label={t('settings.newPwd')} placeholder={t('admins.newPwdPh')} value={resetPwd} onChange={(e) => setResetPwd(e.target.value)} showStrength disabled={resetting} />
        </div>
      </Modal>
    </div>
  );
}
