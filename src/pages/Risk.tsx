import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { cn } from "../lib/utils";
import { Alert } from "../components/ui/alert";

function Kv({ k, v, num }: { k: string; v: string; num?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className={cn("text-base font-semibold", num && "num")}>{v}</span>
    </div>
  );
}

export function Risk() {
  const { t } = useI18n();
  const { data, loading, error, reload } = useFetch(api.getRisk);

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold mb-3">{t("risk.title")}</h1>
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <Kv k={t("risk.insuranceFund")} v={(data as any)?.insurance_fund ?? "-"} num />
        <Kv k={t("risk.socializedLoss")} v={(data as any)?.socialized_loss ?? "-"} num />
        <Kv
          k={t("risk.adlSymbols")}
          v={((data as any)?.adl_queue ?? []).join(", ") || t("common.none")}
        />
        <Kv k={t("risk.snapshotTime")} v={formatDateTime((data as any)?.updated_at)} />
      </div>

      <ApiTable
        title={t("risk.queueTitle")}
        rows={(data as any)?.liquidations ?? []}
        loading={loading}
        onReload={reload}
        emptyText={t("risk.empty")}
        columns={[
          { key: "user_id", label: t("col.userId") },
          { key: "symbol", label: t("col.symbolPair") },
          { key: "side", label: t("col.side") },
          { key: "size", label: t("col.positionSize") },
          { key: "liq_price", label: t("col.liqPrice") },
          { key: "equity", label: t("col.equity") },
          { key: "detected", label: t("col.detected") },
        ]}
      />
      <p className="text-muted-foreground text-xs">
        {t("risk.note")}
      </p>
    </div>
  );
}
