import { useI18n } from "../i18n";
import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { Button } from "../components/ui/button";
import { Alert } from "../components/ui/alert";
import { MaskedText } from "../lib/mask";
import { Loader2 } from "lucide-react";
import { cn } from "../lib/utils";

function fmtNum(v: any): string {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

function Kv({ k, v, num }: { k: string; v: string; num?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className={cn("text-base font-semibold", num && "num")}>{v}</span>
    </div>
  );
}

interface AssetRow {
  asset: string;
  onchain_total: number;
}

export function PlatformAssets() {
  const { t } = useI18n();
  const { data, loading, error, reload } = useFetch(api.getLedger);

  const total = data?.total_assets ?? 0;
  const assets: AssetRow[] = data?.assets ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">{t("platformAssets.title")}</h1>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading} className="gap-1.5">
          {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("platformAssets.refresh")}
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {loading && !data ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("common.loading")}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Kv k={t("platformAssets.totalAssets")} v={fmtNum(total)} num />
            <Kv k={t("platformAssets.reconciled")} v={data?.reconciled ? t("common.yes") : t("common.no")} />
            <Kv k={t("platformAssets.discrepancy")} v={fmtNum(data?.discrepancy ?? 0)} num />
            <Kv k={t("platformAssets.settleBalance")} v={fmtNum(data?.settlement_balance ?? 0)} num />
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold">{t("platformAssets.byAsset")}</h2>
            {assets.length > 0 ? (
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-3 py-2 font-medium">{t("platformAssets.coin")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("platformAssets.onchainTotal")}</th>
                      <th className="px-3 py-2 text-right font-medium">{t("platformAssets.share")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assets.map((a) => {
                      const pct = total > 0 ? (Number(a.onchain_total) / total) * 100 : 0;
                      return (
                        <tr key={a.asset} className="border-b border-muted last:border-0">
                          <td className="px-3 py-2 font-medium">{a.asset}</td>
                          <td className="px-3 py-2 text-right num">
                            <MaskedText value={fmtNum(a.onchain_total)} mask="balance" />
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex items-center justify-end gap-2">
                              <span className="num text-muted-foreground">{pct.toFixed(2)}%</span>
                              <div className="h-1.5 w-24 overflow-hidden rounded bg-muted">
                                <div
                                  className="h-full rounded bg-primary"
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Alert variant="info">{t("platformAssets.noData")}</Alert>
            )}
          </div>
        </>
      )}
    </div>
  );
}
