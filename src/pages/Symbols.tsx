import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";

export function Symbols() {
  const { data, loading, error, reload } = useFetch(api.listSymbols);
  const [symbol, setSymbol] = useState("");
  const [fee, setFee] = useState("0.001");
  const [lev, setLev] = useState("20");
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = async (row: any) => {
    const next = row.status === "online" ? "offline" : "online";
    try {
      await api.upsertSymbol({ ...row, status: next });
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "操作失败");
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const [base, quote] = symbol.split("_");
    try {
      await api.upsertSymbol({
        symbol,
        base: base || symbol,
        quote: quote || "USDT",
        status: "online",
        fee_rate: parseFloat(fee),
        max_leverage: parseInt(lev, 10),
        min_qty: 0.0001,
      });
      setSymbol("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? "创建失败");
    }
  };

  return (
    <div className="page">
      <h1>交易对 / 参数配置</h1>
      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder="交易对(如 BTC_USDT)" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
        <input placeholder="手续费率" value={fee} onChange={(e) => setFee(e.target.value)} type="number" step="0.0001" />
        <input placeholder="最大杠杆" value={lev} onChange={(e) => setLev(e.target.value)} type="number" />
        <button className="btn" type="submit">
          新建交易对
        </button>
      </form>

      <ApiTable
        title="交易对列表"
        rows={data ?? []}
        loading={loading}
        onReload={reload}
        columns={[
          { key: "symbol", label: "交易对" },
          { key: "base", label: "基础币" },
          { key: "quote", label: "计价币" },
          { key: "status", label: "状态" },
          { key: "fee_rate", label: "手续费率" },
          { key: "max_leverage", label: "最大杠杆" },
          { key: "min_qty", label: "最小数量" },
          {
            key: "op",
            label: "操作",
            render: (row: any) => (
              <button className="btn" onClick={() => toggle(row)}>
                {row.status === "online" ? "下线" : "上线"}
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
