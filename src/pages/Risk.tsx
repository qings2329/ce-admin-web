import { api } from "../api/client";
import { useFetch } from "../lib/useFetch";
import { ApiTable } from "../components/ApiTable";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";

export function Risk() {
  const { t } = useI18n();
  const { data, loading, error, reload } = useFetch(api.getRisk);

  return (
    <div className="page">
      <h1>{t("risk.title")}</h1>
      {error && <div className="alert-error">{error}</div>}

      <div className="kv-grid">
        <div className="kv">
          <span className="kv-k">{t("risk.insuranceFund")}</span>
          <span className="kv-v">{(data as any)?.insurance_fund ?? "-"}</span>
        </div>
        <div className="kv">
          <span className="kv-k">{t("risk.socializedLoss")}</span>
          <span className="kv-v">{(data as any)?.socialized_loss ?? "-"}</span>
        </div>
        <div className="kv">
          <span className="kv-k">{t("risk.adlSymbols")}</span>
          <span className="kv-v">
            {((data as any)?.adl_queue ?? []).join(", ") || t("common.none")}
          </span>
        </div>
        <div className="kv">
          <span className="kv-k">{t("risk.snapshotTime")}</span>
          <span className="kv-v">{formatDateTime((data as any)?.updated_at)}</span>
        </div>
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
      <p className="muted">
        {t("risk.note")}
      </p>
    </div>
  );
}
