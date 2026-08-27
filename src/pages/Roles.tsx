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
import { Alert } from "../components/ui/alert";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";

export function Roles() {
  const { t } = useI18n();
  const { perms } = useAuth();
  const canManage = hasPerm(perms, "role:manage");

  const rolesFetch = usePaged((p) => api.listRoles(p));
  const permsFetch = useFetch(api.listPermissions);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [editTarget, setEditTarget] = useState<{ id: number; name: string; description: string } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const roles = (rolesFetch.items ?? []) as any[];
  const permDict = (permsFetch.data ?? []) as any[];

  // 按分组聚合权限字典
  const grouped: Record<string, any[]> = {};
  for (const p of permDict) {
    (grouped[p.group] ??= []).push(p);
  }

  const selectRole = (r: any) => {
    setSelected(r.id);
    const m: Record<string, boolean> = {};
    for (const p of r.permissions ?? []) m[p] = true;
    setChecked(m);
    setMsg(null);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!name) {
      setMsg(t('roles.pleaseName'));
      return;
    }
    try {
      await api.createRole({ name, description: desc });
      setName("");
      setDesc("");
      rolesFetch.reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    }
  };

  const savePerms = async () => {
    if (selected == null) return;
    setMsg(null);
    const list = Object.keys(checked).filter((k) => checked[k]);
    try {
      await api.setRolePermissions(selected, list);
      rolesFetch.reload();
      setMsg(t('roles.permSaved'));
    } catch (e: any) {
      setMsg(e?.message ?? t('common.saveFailed'));
    }
  };

  const del = async (id: number) => {
    if (!window.confirm(t('roles.confirmDelete'))) return;
    try {
      await api.deleteRole(id);
      if (selected === id) setSelected(null);
      rolesFetch.reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.deleteFailed'));
    }
  };

  // 编辑角色名与描述（权限分配走单独的「分配权限」）。
  const saveRoleMeta = async () => {
    if (!editTarget || !editTarget.name) return;
    setMsg(null);
    try {
      await api.updateRole(editTarget.id, {
        name: editTarget.name,
        description: editTarget.description,
      });
      setMsg(t('roles.roleUpdated'));
      setEditTarget(null);
      rolesFetch.reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    }
  };

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
      <h1 className="text-xl font-semibold">{t('roles.title2')}</h1>
      {msg && <Alert variant="info">{msg}</Alert>}

      <form className="flex flex-wrap items-center gap-2 mb-3" onSubmit={create}>
        <Input placeholder={t('roles.namePh')} value={name} onChange={(e) => setName(e.target.value)} />
        <Input placeholder={t('roles.descPh')} value={desc} onChange={(e) => setDesc(e.target.value)} />
        <Button type="submit">{t('roles.create')}</Button>
      </form>

      <ApiTable
        title={t('roles.listTitle')}
        rows={roles}
        loading={rolesFetch.loading}
        error={rolesFetch.error}
        onReload={rolesFetch.reload}
        actions={
          <Pager
            total={rolesFetch.total}
            limit={rolesFetch.limit}
            page={rolesFetch.page}
            onChange={rolesFetch.changePage}
            onLimitChange={rolesFetch.changeLimit}
          />
        }
        columns={[
          { key: "id", label: "ID", render: (row: any) => <span className="num">{row.id}</span> },
          { key: "name", label: t('col.roleName') },
          { key: "description", label: t('col.description') },
          {
            key: "permissions",
            label: t('col.permCount'),
            render: (row: any) => <span className="num">{String((row.permissions ?? []).length)}</span>,
          },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  onClick={() =>
                    setEditTarget({ id: row.id, name: row.name, description: row.description ?? "" })
                  }
                >
                  {t('common.edit')}
                </Button>
                <Button variant="outline" onClick={() => selectRole(row)}>
                  {t('roles.assign')}
                </Button>
                <Button variant="destructive" onClick={() => del(row.id)}>
                  {t('common.delete')}
                </Button>
              </div>
            ),
          },
        ]}
      />

      {selected != null && (
        <Card>
          <CardHeader>
            <CardTitle>{t('roles.assignTitle', { id: selected })}</CardTitle>
            <Button onClick={savePerms}>{t('roles.savePerms')}</Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(grouped).map(([g, items]) => (
                <div key={g}>
                  <h3 className="mb-2 text-sm font-medium">{g}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {items.map((p) => (
                      <label key={p.key} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={!!checked[p.key]}
                          onChange={(e) =>
                            setChecked((c) => ({ ...c, [p.key]: e.target.checked }))
                          }
                        />
                        <span>
                          <b>{p.name}</b> <code className="num text-xs text-muted-foreground">{p.key}</code>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              <h2 className="text-base font-semibold">{t('roles.editTitle', { id: editTarget.id })}</h2>
              <Button variant="ghost" onClick={() => setEditTarget(null)}>
                {t('common.close')}
              </Button>
            </div>
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                saveRoleMeta();
              }}
            >
              <Input
                placeholder={t('roles.namePh')}
                value={editTarget.name}
                onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })}
              />
              <Input
                placeholder={t('roles.descPh')}
                value={editTarget.description}
                onChange={(e) => setEditTarget({ ...editTarget, description: e.target.value })}
              />
              <Button type="submit" disabled={!editTarget.name}>
                {t('roles.save')}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
