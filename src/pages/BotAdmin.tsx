import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ApiTable } from "../components/ApiTable";
import { useI18n } from "../i18n";

export function BotAdmin() {
  const { t } = useI18n();
  const [strategies, setStrategies] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const d = await api.listBotStrategies();
      setStrategies(d.strategies ?? []);
    } catch (e: any) {
      setError(e?.message ?? t("common.queryFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleTick = async (id: number | string) => {
    if (!window.confirm(t("bot.tickConfirm"))) return;
    setMsg(null);
    try {
      await api.botTick(id);
      setMsg(t("bot.tickSuccess"));
    } catch (e: any) {
      setMsg(t("bot.tickFailed") + ": " + (e?.message ?? ""));
    }
  };

  const statusLabel = (s: string) => {
    const m: Record<string, string> = {
      active: t("bot.stActive"),
      stopped: t("bot.stStopped"),
      pending: t("bot.stPending"),
    };
    return m[s] ?? s;
  };

  const filtered = statusFilter
    ? strategies.filter((s) => (s.status ?? s.state) === statusFilter)
    : strategies;

  return (
    <div className="page">
      <h1>{t("bot.title")}</h1>
      {msg && <div className="alert-info">{msg}</div>}
      {error && <div className="alert-error">{error}</div>}

      <div style={{ marginBottom: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t("common.allStatus")}</option>
          <option value="active">{t("bot.stActive")}</option>
          <option value="stopped">{t("bot.stStopped")}</option>
          <option value="pending">{t("bot.stPending")}</option>
        </select>
      </div>

      <ApiTable
        title={t("bot.strategiesTitle")}
        rows={filtered}
        loading={loading}
        error={error}
        onReload={load}
        emptyText={t("bot.noStrategies")}
        actions={
          <button className="btn" onClick={load}>
            {t("common.refresh")}
          </button>
        }
        columns={[
          { key: "id", label: t("bot.strategyId") },
          { key: "name", label: t("bot.strategyName") },
          { key: "symbol", label: t("bot.symbol") },
          { key: "side", label: t("bot.side") },
          { key: "type", label: t("bot.type") },
          {
            key: "status",
            label: t("bot.status"),
            render: (row: any) => statusLabel(row.status ?? row.state),
          },
          { key: "user_id", label: t("bot.userId") },
          {
            key: "params",
            label: t("bot.params"),
            render: (row: any) =>
              row.params ? JSON.stringify(row.params) : "-",
          },
          { key: "created_at", label: t("bot.createdAt") },
          {
            key: "op",
            label: "",
            render: (row: any) => (
              <button className="btn" onClick={() => handleTick(row.id)}>
                {t("bot.tick")}
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
