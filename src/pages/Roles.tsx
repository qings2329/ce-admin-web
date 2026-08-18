import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useAuth, hasPerm } from "../lib/auth";
import { useI18n } from "../i18n";

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
      <div className="page">
        <h1>{t('roles.title')}</h1>
        <div className="alert-error">{t('roles.noPerm')}</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{t('roles.title2')}</h1>
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder={t('roles.namePh')} value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder={t('roles.descPh')} value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className="btn" type="submit">
          {t('roles.create')}
        </button>
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
          { key: "id", label: "ID" },
          { key: "name", label: t('col.roleName') },
          { key: "description", label: t('col.description') },
          {
            key: "permissions",
            label: t('col.permCount'),
            render: (row: any) => String((row.permissions ?? []).length),
          },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <>
                <button
                  className="btn"
                  onClick={() =>
                    setEditTarget({ id: row.id, name: row.name, description: row.description ?? "" })
                  }
                >
                  {t('common.edit')}
                </button>
                <button className="btn" onClick={() => selectRole(row)}>
                  {t('roles.assign')}
                </button>
                <button className="btn" onClick={() => del(row.id)}>
                  {t('common.delete')}
                </button>
              </>
            ),
          },
        ]}
      />

      {selected != null && (
        <section className="panel">
          <div className="panel-head">
            <h2>{t('roles.assignTitle', { id: selected })}</h2>
            <button className="btn" onClick={savePerms}>
              {t('roles.savePerms')}
            </button>
          </div>
          <div className="perm-groups">
            {Object.entries(grouped).map(([g, items]) => (
              <div key={g} className="perm-group">
                <h3>{g}</h3>
                <div className="perm-items">
                  {items.map((p) => (
                    <label key={p.key} className="perm-item">
                      <input
                        type="checkbox"
                        checked={!!checked[p.key]}
                        onChange={(e) =>
                          setChecked((c) => ({ ...c, [p.key]: e.target.checked }))
                        }
                      />
                      <span>
                        <b>{p.name}</b>
                        <code>{p.key}</code>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {editTarget != null && (
        <div className="modal-overlay" onClick={() => setEditTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="panel-head">
              <h2>{t('roles.editTitle', { id: editTarget.id })}</h2>
              <button className="btn" onClick={() => setEditTarget(null)}>
                {t('common.close')}
              </button>
            </div>
            <form
              className="inline-form"
              onSubmit={(e) => {
                e.preventDefault();
                saveRoleMeta();
              }}
            >
              <input
                placeholder={t('roles.namePh')}
                value={editTarget.name}
                onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })}
              />
              <input
                placeholder={t('roles.descPh')}
                value={editTarget.description}
                onChange={(e) => setEditTarget({ ...editTarget, description: e.target.value })}
              />
              <button className="btn" type="submit" disabled={!editTarget.name}>
                {t('roles.save')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
