import { useState } from "react";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";

export function Ops() {
  const ledger = useFetch(api.getLedger);
  const services = useFetch(api.getServices);
  const notifs = useFetch(api.listNotifications);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [level, setLevel] = useState("info");
  const [msg, setMsg] = useState<string | null>(null);

  const createNotif = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createNotification({ title, body, level });
      setTitle("");
      setBody("");
      notifs.reload();
    } catch (e: any) {
      setMsg(e?.message ?? "创建失败");
    }
  };

  const delNotif = async (id: number) => {
    try {
      await api.deleteNotification(id);
      notifs.reload();
    } catch (e: any) {
      setMsg(e?.message ?? "删除失败");
    }
  };

  const ld = ledger.data as any;

  return (
    <div className="page">
      <h1>运营看板</h1>
      {msg && <div className="alert-info">{msg}</div>}

      <h2>账本对账</h2>
      <div className="kv-grid">
        <div className="kv">
          <span className="kv-k">总资产</span>
          <span className="kv-v">{ld?.total_assets ?? "-"}</span>
        </div>
        <div className="kv">
          <span className="kv-k">结算余额</span>
          <span className="kv-v">{ld?.settlement_balance ?? "-"}</span>
        </div>
        <div className="kv">
          <span className="kv-k">已对账</span>
          <span className="kv-v">{ld?.reconciled ? "是" : "否"}</span>
        </div>
        <div className="kv">
          <span className="kv-k">差异</span>
          <span className="kv-v">{ld?.discrepancy ?? "-"}</span>
        </div>
      </div>

      <ApiTable
        title="服务健康"
        rows={services.data ?? []}
        loading={services.loading}
        error={services.error}
        onReload={services.reload}
        columns={[
          { key: "name", label: "服务" },
          { key: "status", label: "状态" },
          { key: "latency_ms", label: "延迟(ms)" },
          { key: "last_check", label: "最近检查" },
        ]}
      />

      <h2>运营通知</h2>
      <form className="inline-form" onSubmit={createNotif}>
        <input placeholder="标题" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder="内容" value={body} onChange={(e) => setBody(e.target.value)} />
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="info">info</option>
          <option value="warning">warning</option>
          <option value="critical">critical</option>
        </select>
        <button className="btn" type="submit">
          发布通知
        </button>
      </form>

      <ApiTable
        title="通知列表"
        rows={notifs.data ?? []}
        loading={notifs.loading}
        error={notifs.error}
        onReload={notifs.reload}
        columns={[
          { key: "id", label: "ID" },
          { key: "title", label: "标题" },
          { key: "body", label: "内容" },
          { key: "level", label: "级别" },
          { key: "created_at", label: "发布时间" },
          {
            key: "op",
            label: "操作",
            render: (row: any) => (
              <button className="btn" onClick={() => delNotif(row.id)}>
                删除
              </button>
            ),
          },
        ]}
      />
      <p className="muted">
        注：账本与服务健康当前为管理后台内存只读视图，后续应接入 settlement 实时对账与各微服务健康探测。
      </p>
    </div>
  );
}
