import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";

export function Coins() {
  const { data, loading, error, reload } = useFetch(api.listCoins);
  const [symbol, setSymbol] = useState("");
  const [name, setName] = useState("");
  const [chain, setChain] = useState("");
  const [precision, setPrecision] = useState("8");
  const [fee, setFee] = useState("0.0005");
  const [msg, setMsg] = useState<string | null>(null);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createCoin({
        symbol,
        name,
        chain,
        precision: parseInt(precision, 10),
        withdraw_fee: parseFloat(fee),
      });
      setSymbol("");
      setName("");
      setChain("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "创建失败");
    }
  };

  return (
    <div className="page">
      <h1>币种管理</h1>
      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder="符号(如 BTC)" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <input placeholder="名称(如 Bitcoin)" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="所属公链" value={chain} onChange={(e) => setChain(e.target.value)} />
        <input placeholder="精度" value={precision} onChange={(e) => setPrecision(e.target.value)} type="number" />
        <input placeholder="提币手续费" value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.0001" />
        <button className="btn" type="submit">
          新币种
        </button>
      </form>

      <ApiTable
        title="币种列表"
        rows={data ?? []}
        loading={loading}
        onReload={reload}
        columns={[
          { key: "id", label: "ID" },
          { key: "symbol", label: "符号" },
          { key: "name", label: "名称" },
          { key: "chain", label: "公链" },
          { key: "precision", label: "精度" },
          { key: "withdraw_fee", label: "提币手续费" },
          { key: "updated_at", label: "更新时间" },
        ]}
      />
    </div>
  );
}
