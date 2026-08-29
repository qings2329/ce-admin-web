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
import { Alert } from "../components/ui/alert";
import { DestructiveActionGuard } from "../components/ui/DestructiveActionGuard";
import { Modal } from "../components/ui/Modal";
import { AlertTriangle } from "lucide-react";

export function Roles() {
  const { t } = useI18n();
  const { perms } = useAuth();
  const canManage = hasPerm(perms, "role:manage");

  const rolesFetch = usePaged((p) => api.listRoles(p));
  const permsFetch = useFetch(api.listPermissions);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [editTarget, setEditTarget] = useState<{ id: number; name: string; description: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingPerms, setSavingPerms] = useState(false);

  const roles = (rolesFetch.items ?? []) as any[];
  const permDict = (permsFetch.data ?? []) as any[];

  const grouped: Record<string, any[]> = {};
  for (const p of permDict) (grouped[p.group] ??= []).push(p);

  const selectRole = (r: any) => {
    setSelected(r.id);
    const m: Record<string, boolean> = {};
    for (const p of r.permissions ?? []) m[p] = true;
    setChecked(m); setMsg(null);
  };

  const doCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null);
    if (!name) { setMsg(t('roles.pleaseName')); return; }
    if (!desc.trim()) { setMsg(t('roles.pleaseDesc')); return; }
    setCreating(true);
    try {
      await api.createRole({ name, description: desc });
      setName(""); setDesc(""); setShowCreate(false);
      rolesFetch.reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    } finally { setCreating(false); }
  };

  const savePerms = async () => {
    if (selected == null) return;
    setMsg(null); setSavingPerms(true);
    const list = Object.keys(checked).filter((k) => checked[k]);
    try {
      await api.setRolePermissions(selected, list);
      rolesFetch.reload(); setMsg(t('roles.permSaved'));
    } catch (e: any) {
      setMsg(e?.message ?? t('common.saveFailed'));
    } finally { setSavingPerms(false); }
  };

  const saveRoleMeta = async () => {
    if (!editTarget || !editTarget.name) return;
    setMsg(null); setSavingEdit(true);
    try {
      await api.updateRole(editTarget.id, { name: editTarget.name, description: editTarget.description });
      setMsg(t('roles.roleUpdated')); setEditTarget(null);
      rolesFetch.reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    } finally { setSavingEdit(false); }
  };

  const openCreate = () => { setName(""); setDesc(""); setMsg(null); setShowCreate(true); };

  if (!canManage) {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">{t('roles.title')}</h1>
        <Alert variant="error">{t('roles.noPerm')}</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t('roles.title2')}</h1>
        <Button onClick={openCreate} className="gap-1.5">{t('roles.create')}</Button>
      </div>
      {msg && <Alert variant="info">{msg}</Alert>}

      <ApiTable
        title={t('roles.listTitle')} rows={roles} loading={rolesFetch.loading} error={rolesFetch.error} onReload={rolesFetch.reload}
        actions={<Pager total={rolesFetch.total} limit={rolesFetch.limit} page={rolesFetch.page} onChange={rolesFetch.changePage} onLimitChange={rolesFetch.changeLimit} />}
        columns={[
          { key: "id", label: "ID", render: (row: any) => <span className="num">{row.id}</span> },
          { key: "name", label: t('col.roleName') },
          { key: "description", label: t('col.description') },
          { key: "permissions", label: t('col.permCount'), render: (row: any) => <span className="num">{String((row.permissions ?? []).length)}</span> },
          {
            key: "op", label: t('col.actions'),
            render: (row: any) => (
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => setEditTarget({ id: row.id, name: row.name, description: row.description ?? "" })}>{t('common.edit')}</Button>
                <Button size="sm" variant="outline" onClick={() => selectRole(row)}>{t('roles.assign')}</Button>
                <DestructiveActionGuard confirmText={String(row.name || row.id)} confirmLabel={t('common.delete')}
                  onConfirm={async () => {
                    try { await api.deleteRole(row.id); if (selected === row.id) setSelected(null); rolesFetch.reload(); }
                    catch (e: any) { setMsg(e?.message ?? t('common.deleteFailed')); }
                  }}
                  trigger={<Button size="sm" variant="destructive" className="border-dashed"><AlertTriangle className="h-3.5 w-3.5" />{t('common.delete')}</Button>} />
              </div>
            ),
          },
        ]}
      />

      <Modal open={showCreate} title={t('roles.create')} onClose={() => setShowCreate(false)}
        footer={<Button onClick={doCreate} disabled={creating} className="gap-1.5">
          {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t('roles.create')}
        </Button>}>
        <div className="space-y-3">
          <Input placeholder={t('roles.namePh')} value={name} onChange={(e) => setName(e.target.value)} disabled={creating} />
          <Input placeholder={t('roles.descPh')} value={desc} onChange={(e) => setDesc(e.target.value)} disabled={creating} />
        </div>
      </Modal>

      <Modal open={editTarget != null} title={t('roles.editTitle', { id: editTarget!.id })} onClose={() => setEditTarget(null)}
        footer={<Button disabled={!editTarget?.name || savingEdit} onClick={saveRoleMeta} className="gap-1.5">
          {savingEdit && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t('roles.save')}
        </Button>}>
        <div className="space-y-3">
          <Input placeholder={t('roles.namePh')} value={editTarget?.name ?? ""} onChange={(e) => setEditTarget({ ...editTarget!, name: e.target.value })} disabled={savingEdit} />
          <Input placeholder={t('roles.descPh')} value={editTarget?.description ?? ""} onChange={(e) => setEditTarget({ ...editTarget!, description: e.target.value })} disabled={savingEdit} />
        </div>
      </Modal>

      {selected != null && (
        <Modal open={true} title={t('roles.assignTitle', { id: selected })} onClose={() => setSelected(null)} size="lg"
          footer={<Button onClick={savePerms} disabled={savingPerms} className="gap-1.5">
            {savingPerms && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t('roles.savePerms')}
          </Button>}>
          <div className="space-y-3 max-h-[60vh] overflow-auto">
            {Object.entries(grouped).map(([g, items]) => (
              <div key={g}>
                <h3 className="mb-2 text-sm font-medium">{g}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {items.map((p) => (
                    <label key={p.key} className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={!!checked[p.key]} onChange={(e) => setChecked((c) => ({ ...c, [p.key]: e.target.checked }))} />
                      <span><b>{p.name}</b> <code className="num text-xs text-muted-foreground">{p.key}</code></span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
