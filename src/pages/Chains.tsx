import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";

export function Chains() {
  const { data, loading, error, reload } = useFetch(api.listChains);
  const [name, setName] = useState("");
  const [symbol, setSymbol] = useState("");
  const [confirmations, setConfirmations] = useState("3");
  const [msg, setMsg] = useState<string | null>(null);

  const toggleDeposit = async (row: any) => {
    try {
      await api.updateChain(row.id, { ...row, deposit_enabled: !row.deposit_enabled });
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "操作失败");
    }
  };

  const toggleWithdraw = async (row: any) => {
    try {
      await api.updateChain(row.id, { ...row, withdraw_enabled: !row.withdraw_enabled });
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "操作失败");
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createChain({
        name,
        symbol,
        confirmations: parseInt(confirmations, 10),
        deposit_enabled: true,
        withdraw_enabled: false,
      });
      setName("");
      setSymbol("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "创建失败");
    }
  };

  return (
    <div className="page">
      <h1>公链管理</h1>
      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder="链名(如 Bitcoin)" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="符号(如 BTC)" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <input placeholder="确认数" value={confirmations} onChange={(e) => setConfirmations(e.target.value)} type="number" />
        <button className="btn" type="submit">
          新建公链
        </button>
      </form>

      <ApiTable
        title="公链列表"
        rows={data ?? []}
        loading={loading}
        onReload={reload}
        columns={[
          { key: "id", label: "ID" },
          { key: "name", label: "名称" },
          { key: "symbol", label: "符号" },
          { key: "confirmations", label: "确认数" },
          { key: "deposit_enabled", label: "充币", render: (r: any) => (r.deposit_enabled ? "开" : "关") },
          { key: "withdraw_enabled", label: "提币", render: (r: any) => (r.withdraw_enabled ? "开" : "关") },
          {
            key: "op",
            label: "操作",
            render: (row: any) => (
              <span>
                <button className="btn" onClick={() => toggleDeposit(row)}>
                  充币{row.deposit_enabled ? "关" : "开"}
                </button>{" "}
                <button className="btn" onClick={() => toggleWithdraw(row)}>
                  提币{row.withdraw_enabled ? "关" : "开"}
                </button>
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
