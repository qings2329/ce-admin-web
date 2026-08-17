import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";

export function Deposits() {
  const deposits = useFetch(api.listDeposits);
  const withdrawals = useFetch(api.listWithdrawals);
  const [msg, setMsg] = useState<string | null>(null);

  const decide = async (id: number, approve: boolean) => {
    setMsg(null);
    try {
      if (approve) await api.approveWithdrawal(id);
      else await api.rejectWithdrawal(id);
      withdrawals.reload();
    } catch (e: any) {
      setMsg(e?.message ?? "操作失败");
    }
  };

  return (
    <div className="page">
      <h1>充值提币记录</h1>
      {msg && <div className="alert-info">{msg}</div>}

      <ApiTable
        title="充值记录"
        rows={deposits.data ?? []}
        loading={deposits.loading}
        error={deposits.error}
        onReload={deposits.reload}
        columns={[
          { key: "id", label: "ID" },
          { key: "user_id", label: "用户ID" },
          { key: "coin", label: "币种" },
          { key: "chain", label: "公链" },
          { key: "amount", label: "数量" },
          { key: "tx_hash", label: "交易哈希" },
          { key: "status", label: "状态" },
          { key: "time", label: "时间" },
        ]}
      />

      <ApiTable
        title="提币记录（需审核）"
        rows={withdrawals.data ?? []}
        loading={withdrawals.loading}
        error={withdrawals.error}
        onReload={withdrawals.reload}
        columns={[
          { key: "id", label: "ID" },
          { key: "user_id", label: "用户ID" },
          { key: "coin", label: "币种" },
          { key: "chain", label: "公链" },
          { key: "amount", label: "数量" },
          { key: "address", label: "提币地址" },
          { key: "status", label: "状态" },
          { key: "time", label: "时间" },
          {
            key: "op",
            label: "操作",
            render: (row: any) =>
              row.status === "pending" ? (
                <span>
                  <button className="btn" onClick={() => decide(row.id, true)}>
                    通过
                  </button>{" "}
                  <button className="btn" onClick={() => decide(row.id, false)}>
                    拒绝
                  </button>
                </span>
              ) : (
                <span className="muted">已处理</span>
              ),
          },
        ]}
      />
    </div>
  );
}
