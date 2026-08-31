import { useState } from "react";
import { Search, Loader2, Wallet } from "lucide-react";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";
import { Select } from "../components/ui/select";
import { MaskedText } from "../lib/mask";

// 后端 getUserBalances 当前仅聚合 USDT/BTC/ETH（handlers_user_balances.go）。
// 用于「按币种」模式在查询前提供币种下拉；查询结果仍按后端实际返回动态渲染，
// 因此后端未来扩展资产时前端无需改动。
const COMMON_ASSETS = ["USDT", "BTC", "ETH"];

function formatNum(v: any): string {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

interface BalAsset {
  asset: string;
  available: number;
  frozen: number;
  withdraw_frozen: number;
  exists: boolean;
}
interface BalResult {
  user_id: number;
  assets: BalAsset[];
  total_assets: number;
}

export function Balances() {
  const { t } = useI18n();
  const [mode, setMode] = useState<"user" | "asset">("user");
  const [q, setQ] = useState("");
  const [asset, setAsset] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<any[] | null>(null);
  const [result, setResult] = useState<BalResult | null>(null);
  const [queriedUser, setQueriedUser] = useState<{ id: number; username?: string } | null>(null);

  const clearResult = () => {
    setError(null);
    setCandidates(null);
    setResult(null);
    setQueriedUser(null);
  };

  const switchMode = (m: "user" | "asset") => {
    setMode(m);
    setAsset("");
    clearResult();
  };

  const doQuery = async (userId: number, label?: string) => {
    setLoading(true);
    setError(null);
    setCandidates(null);
    try {
      const data = await api.getUserBalances(userId);
      setResult(data);
      setQueriedUser({ id: userId, username: label });
    } catch (e: any) {
      setError(e?.message ?? t("common.opFailed"));
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = q.trim();
    if (!query) {
      setError(t("balances.inputPlaceholder"));
      return;
    }
    if (mode === "asset" && !asset) {
      setError(t("balances.selectAsset"));
      return;
    }
    clearResult();

    // 纯数字 UID：直接查余额（后端对不存在用户返回 200 空资产）
    if (/^\d+$/.test(query)) {
      await doQuery(Number(query));
      return;
    }

    // 用户名 / 邮箱：先搜索定位用户
    setLoading(true);
    try {
      const { items } = await api.listUsers({ q: query });
      if (!items || items.length === 0) {
        setError(t("balances.userNotFound"));
        return;
      }
      if (items.length === 1) {
        await doQuery(Number(items[0].id), items[0].username);
      } else {
        setCandidates(items);
      }
    } catch (e: any) {
      setError(e?.message ?? t("common.opFailed"));
    } finally {
      setLoading(false);
    }
  };

  const rows = result?.assets ?? [];
  const visibleRows = asset ? rows.filter((a) => a.asset === asset) : rows;
  const assetOptions = Array.from(new Set(rows.map((a) => a.asset)));

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-foreground">{t("balances.title")}</h1>

      <div className="flex gap-2">
        <Button
          type="button"
          variant={mode === "user" ? "default" : "outline"}
          size="sm"
          onClick={() => switchMode("user")}
        >
          {t("balances.byUser")}
        </Button>
        <Button
          type="button"
          variant={mode === "asset" ? "default" : "outline"}
          size="sm"
          onClick={() => switchMode("asset")}
        >
          {t("balances.byAsset")}
        </Button>
      </div>

      <form className="flex flex-wrap items-end gap-3" onSubmit={submit}>
        <div className="flex-1 min-w-[220px]">
          <label className="mb-1 block text-sm text-muted-foreground">{t("balances.inputPlaceholder")}</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder={t("balances.inputPlaceholder")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
        {mode === "asset" && (
          <div className="w-40">
            <label className="mb-1 block text-sm text-muted-foreground">{t("balances.selectAsset")}</label>
            <Select value={asset} onChange={(e) => setAsset(e.target.value)}>
              <option value="">{t("balances.selectAsset")}</option>
              {COMMON_ASSETS.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </Select>
          </div>
        )}
        <Button type="submit" disabled={loading} className="gap-1.5">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("common.query")}
        </Button>
      </form>

      {error && <Alert variant="error">{error}</Alert>}

      {candidates && candidates.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t("balances.pickUser")}</p>
          <div className="divide-y overflow-hidden rounded-md border border-border">
            {candidates.map((u) => (
              <button
                key={u.id}
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => doQuery(Number(u.id), u.username)}
              >
                <span className="font-medium">
                  {u.username}{" "}
                  <span className="text-muted-foreground">
                    ({t("balances.userId")}: {u.id})
                  </span>
                </span>
                <span className="truncate text-muted-foreground">{u.email}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {result && !candidates && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Wallet className="h-4 w-4" />
            {queriedUser?.username ? `${queriedUser.username} · ` : ""}
            {t("balances.userId")}: {result.user_id}
            {mode === "asset" && asset ? ` · ${asset}` : ""}
          </div>

          {mode === "user" && assetOptions.length > 0 && (
            <div className="w-48">
              <Select value={asset} onChange={(e) => setAsset(e.target.value)}>
                <option value="">{t("balances.allAssets")}</option>
                {assetOptions.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </Select>
            </div>
          )}

          {visibleRows.length > 0 ? (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-3 py-2 font-medium">{t("col.coin")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("col.available")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("col.frozen")}</th>
                    <th className="px-3 py-2 text-right font-medium">{t("col.withdrawFrozen")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((a) => (
                    <tr key={a.asset} className="border-b border-muted last:border-0">
                      <td className="px-3 py-2 font-medium">{a.asset}</td>
                      <td className="px-3 py-2 text-right num">
                        <MaskedText value={formatNum(a.available)} mask="balance" />
                      </td>
                      <td className="px-3 py-2 text-right num">
                        <MaskedText value={formatNum(a.frozen)} mask="balance" />
                      </td>
                      <td className="px-3 py-2 text-right num">
                        <MaskedText value={formatNum(a.withdraw_frozen)} mask="balance" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Alert variant="info">{t("balances.noAsset")}</Alert>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-2.5">
            <span className="text-sm font-medium">{t("users.totalAssets")}</span>
            <span className="num text-base font-semibold">
              <MaskedText value={formatNum(result.total_assets)} mask="balance" />
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
