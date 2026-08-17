import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";
import { useAuth, hasPerm } from "../lib/auth";

export function Admins() {
  const { perms } = useAuth();
  const canManage = hasPerm(perms, "admin:manage");
  const { data, loading, error, reload } = useFetch(api.listAdmins);
  const rolesFetch = useFetch(api.listRoles);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState<string>("");
  const [msg, setMsg] = useState<string | null>(null);

  const roles = (rolesFetch.data ?? []) as any[];

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (roleId === "") {
      setMsg("请选择角色");
      return;
    }
    try {
      await api.createAdmin({ username, password, role_id: Number(roleId) });
      setUsername("");
      setPassword("");
      setRoleId("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "创建失败");
    }
  };

  const activate = async (id: number) => {
    try {
      await api.activateAdmin(id);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "操作失败");
    }
  };
  const disable = async (id: number) => {
    try {
      await api.disableAdmin(id);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "操作失败");
    }
  };
  const reset = async (id: number) => {
    const pw = window.prompt("输入新密码（至少 6 位）");
    if (!pw) return;
    try {
      await api.resetAdminPassword(id, pw);
      setMsg("密码已重置");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "重置失败");
    }
  };

  if (!canManage) {
    return (
      <div className="page">
        <h1>管理员管理</h1>
        <div className="alert-error">无访问权限（需 admin:manage）</div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>管理员管理</h1>
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input
          placeholder="初始密码"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <select value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          <option value="">选择角色</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          新增管理员
        </button>
        <span className="muted">新增后默认待激活（pending），需激活方可登录</span>
      </form>

      <ApiTable
        title="管理员列表"
        rows={data ?? []}
        loading={loading}
        error={error}
        onReload={reload}
        columns={[
          { key: "id", label: "ID" },
          { key: "username", label: "用户名" },
          { key: "status", label: "状态" },
          { key: "role_name", label: "角色" },
          {
            key: "totp_enabled",
            label: "MFA",
            render: (row: any) => (row.totp_enabled ? "已开启" : "未开启"),
          },
          {
            key: "op",
            label: "操作",
            render: (row: any) => (
              <>
                {row.status !== "active" && (
                  <button className="btn" onClick={() => activate(row.id)}>
                    激活
                  </button>
                )}
                {row.status === "active" && (
                  <button className="btn" onClick={() => disable(row.id)}>
                    禁用
                  </button>
                )}
                <button className="btn" onClick={() => reset(row.id)}>
                  重置密码
                </button>
              </>
            ),
          },
        ]}
      />
    </div>
  );
}
