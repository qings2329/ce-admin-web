import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ApiTable } from "../components/ApiTable";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Select } from "../components/ui/select";
import { Alert } from "../components/ui/alert";
import { StatusBadge, type StatusTone } from "../components/ui/status-badge";

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

  const statusTone = (s: string): StatusTone => {
    if (s === "active") return "success";
    if (s === "pending") return "warning";
    if (s === "stopped") return "neutral";
    return "neutral";
  };

  const filtered = statusFilter
    ? strategies.filter((s) => (s.status ?? s.state) === statusFilter)
    : strategies;

  return (
    <div className="space-y-4">
      <h1 className="mb-3 text-lg font-semibold">{t("bot.title")}</h1>
      {msg && <Alert variant="info">{msg}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}

      <div className="mb-3 flex items-center gap-2">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t("common.allStatus")}</option>
          <option value="active">{t("bot.stActive")}</option>
          <option value="stopped">{t("bot.stStopped")}</option>
          <option value="pending">{t("bot.stPending")}</option>
        </Select>
      </div>

      <ApiTable
        title={t("bot.strategiesTitle")}
        rows={filtered}
        loading={loading}
        error={error}
        onReload={load}
        emptyText={t("bot.noStrategies")}
        actions={
          <Button size="sm" variant="outline" onClick={load}>
            {t("common.refresh")}
          </Button>
        }
        columns={[
          {
            key: "id",
            label: t("bot.strategyId"),
            render: (row: any) => <span className="num">{row.id}</span>,
          },
          { key: "name", label: t("bot.strategyName") },
          { key: "symbol", label: t("bot.symbol") },
          { key: "side", label: t("bot.side") },
          { key: "type", label: t("bot.type") },
          {
            key: "status",
            label: t("bot.status"),
            render: (row: any) => {
              const s = row.status ?? row.state;
              return <StatusBadge tone={statusTone(s)}>{statusLabel(s)}</StatusBadge>;
            },
          },
          {
            key: "user_id",
            label: t("bot.userId"),
            render: (row: any) => <span className="num">{row.user_id}</span>,
          },
          {
            key: "params",
            label: t("bot.params"),
            render: (row: any) =>
              row.params ? JSON.stringify(row.params) : "-",
          },
          {
            key: "created_at",
            label: t("bot.createdAt"),
            render: (row: any) => <span className="num">{row.created_at}</span>,
          },
          {
            key: "op",
            label: "",
            render: (row: any) => (
              <Button size="sm" variant="outline" onClick={() => handleTick(row.id)}>
                {t("bot.tick")}
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
