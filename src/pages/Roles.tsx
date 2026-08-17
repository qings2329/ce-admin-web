import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";
import { useAuth, hasPerm } from "../lib/auth";

export function Roles() {
  const { perms } = useAuth();
  const canManage = hasPerm(perms, "role:manage");

  const rolesFetch = useFetch(api.listRoles);
  const permsFetch = useFetch(api.listPermissions);

  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string | null>(null);

  const roles = (rolesFetch.data ?? []) as any[];
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
      setMsg("请填写角色名");
      return;
    }
    try {
      await api.createRole({ name, description: desc });
      setName("");
      setDesc("");
      rolesFetch.reload();
    } catch (e: any) {
      setMsg(e?.message ?? "创建失败");
    }
  };

  const savePerms = async () => {
    if (selected == null) return;
    setMsg(null);
    const list = Object.keys(checked).filter((k) => checked[k]);
    try {
      await api.setRolePermissions(selected, list);
      rolesFetch.reload();
      setMsg("权限已保存");
    } catch (e: any) {
      setMsg(e?.message ?? "保存失败");
    }
  };

  const del = async (id: number) => {
    if (!window.confirm("确认删除该角色？绑定此角色的管理员将失去角色关联。")) return;
    try {
      await api.deleteRole(id);
      if (selected === id) setSelected(null);
      rolesFetch.reload();
    } catch (e: any) {
      setMsg(e?.message ?? "删除失败");
    }
  };

  if (!canManage) {
    return (
      <div className="page">
        <h1>角色与权限</h1>
        <div className="alert-error">无访问权限（需 role:manage）</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>角色与权限管理</h1>
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder="角色名" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="描述" value={desc} onChange={(e) => setDesc(e.target.value)} />
        <button className="btn" type="submit">
          新建角色
        </button>
      </form>

      <ApiTable
        title="角色列表"
        rows={roles}
        loading={rolesFetch.loading}
        error={rolesFetch.error}
        onReload={rolesFetch.reload}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "角色名" },
          { key: "description", label: "描述" },
          {
            key: "permissions",
            label: "权限数",
            render: (row: any) => String((row.permissions ?? []).length),
          },
          {
            key: "op",
            label: "操作",
            render: (row: any) => (
              <>
                <button className="btn" onClick={() => selectRole(row)}>
                  分配权限
                </button>
                <button className="btn" onClick={() => del(row.id)}>
                  删除
                </button>
              </>
            ),
          },
        ]}
      />

      {selected != null && (
        <section className="panel">
          <div className="panel-head">
            <h2>分配权限（角色 #{selected}）</h2>
            <button className="btn" onClick={savePerms}>
              保存权限
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
    </div>
  );
}
