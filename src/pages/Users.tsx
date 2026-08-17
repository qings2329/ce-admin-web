import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";

export function Users() {
  const { data, loading, error, reload } = useFetch(api.listUsers);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [balance, setBalance] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = async (id: number, freeze: boolean) => {
    try {
      if (freeze) await api.freezeUser(id);
      else await api.unfreezeUser(id);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "操作失败");
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createUser({
        username,
        email,
        password,
        balance: parseFloat(balance || "0"),
        status: "active",
        kyc: "none",
      });
      setUsername("");
      setEmail("");
      setPassword("");
      setBalance("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "创建失败");
    }
  };

  return (
    <div className="page">
      <h1>用户与账户管理</h1>
      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="邮箱" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          placeholder="初始密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
        <input
          placeholder="余额"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          type="number"
        />
        <button className="btn" type="submit">
          新建用户
        </button>
      </form>

      <ApiTable
        title="用户列表"
        rows={data ?? []}
        loading={loading}
        onReload={reload}
        columns={[
          { key: "id", label: "ID" },
          { key: "username", label: "用户名" },
          { key: "email", label: "邮箱" },
          { key: "status", label: "状态" },
          { key: "kyc", label: "KYC" },
          { key: "balance", label: "余额" },
          {
            key: "op",
            label: "操作",
            render: (row: any) => (
              <button
                className="btn"
                onClick={() => toggle(row.id, row.status === "active")}
              >
                {row.status === "active" ? "冻结" : "解冻"}
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
