import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";

export function Risk() {
  const { data, loading, error, reload } = useFetch(api.getRisk);

  return (
    <div className="page">
      <h1>风控与强平监控</h1>
      {error && <div className="alert-error">{error}</div>}

      <div className="kv-grid">
        <div className="kv">
          <span className="kv-k">保险基金</span>
          <span className="kv-v">{(data as any)?.insurance_fund ?? "-"}</span>
        </div>
        <div className="kv">
          <span className="kv-k">社会化分摊损失</span>
          <span className="kv-v">{(data as any)?.socialized_loss ?? "-"}</span>
        </div>
        <div className="kv">
          <span className="kv-k">ADL 排队符号</span>
          <span className="kv-v">
            {((data as any)?.adl_queue ?? []).join(", ") || "无"}
          </span>
        </div>
        <div className="kv">
          <span className="kv-k">快照时间</span>
          <span className="kv-v">{(data as any)?.updated_at ?? "-"}</span>
        </div>
      </div>

      <ApiTable
        title="强平队列"
        rows={(data as any)?.liquidations ?? []}
        loading={loading}
        onReload={reload}
        emptyText="当前无待强平持仓"
        columns={[
          { key: "user_id", label: "用户ID" },
          { key: "symbol", label: "交易对" },
          { key: "side", label: "方向" },
          { key: "size", label: "持仓量" },
          { key: "liq_price", label: "强平价" },
          { key: "equity", label: "权益" },
          { key: "detected", label: "发现时间" },
        ]}
      />
      <p className="muted">
        注：风控快照当前为管理后台内存只读视图，后续应接入 futures/settlement 实时强平、穿仓与 ADL 数据。
      </p>
    </div>
  );
}
