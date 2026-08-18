import { useFetch } from "../lib/useFetch";
import { api } from "../api/client";
import { useI18n } from "../i18n";

function Card({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="kv">
      <span className="kv-k">{k}</span>
      <span className="kv-v">{v}</span>
      {hint && <span className="kv-hint">{hint}</span>}
    </div>
  );
}

export function Dashboard() {
  const { t } = useI18n();
  const users = useFetch(api.listUsers);
  const withdrawals = useFetch(api.listWithdrawals);
  const announcements = useFetch(api.listAnnouncements);
  const ledger = useFetch(api.getLedger);
  const risk = useFetch(api.getRisk);
  const services = useFetch(api.getServices);

  const userCount = (users.data?.items ?? []).length;
  const wdRows = (withdrawals.data ?? []) as any[];
  const pendingWd = wdRows.filter((w) => w.status === "pending");
  const annCount = (announcements.data?.announcements ?? []).length;
  const ld = ledger.data as any;
  const rk = risk.data as any;
  const svcRows = (services.data ?? []) as any[];
  const upSvc = svcRows.filter((s) => s.status === "up").length;
  const liqCount = (rk?.liquidations ?? []).length;
  const adlCount = (rk?.adl_queue ?? []).length;

  const loading =
    users.loading || withdrawals.loading || announcements.loading || ledger.loading || risk.loading || services.loading;
  const err =
    users.error || withdrawals.error || announcements.error || ledger.error || risk.error || services.error;

  return (
    <div className="page">
      <h1>{t('dash.title')}</h1>
      {err && <div className="alert-error">{err}</div>}
      {loading && <div className="muted">{t('common.loading')}</div>}

      <section className="panel">
        <h2>{t('dash.keyMetrics')}</h2>
        <div className="kv-grid">
          <Card k={t('dash.usersTotal')} v={String(userCount)} />
          <Card k={t('dash.pendingWithdraw')} v={String(pendingWd.length)} hint={t('dash.pendingWithdrawHint')} />
          <Card k={t('dash.annCount')} v={String(annCount)} />
          <Card
            k={t('dash.totalAssets')}
            v={ld ? String(ld.total_assets ?? "-") : "-"}
            hint={ld ? (ld.reconciled ? t('dash.reconciled') : t('dash.notReconciled')) : undefined}
          />
          <Card k={t('dash.discrepancy')} v={ld ? String(ld.discrepancy ?? "-") : "-"} />
          <Card k={t('dash.insuranceFund')} v={rk ? String(rk.insurance_fund ?? "-") : "-"} />
          <Card k={t('dash.liqWarn')} v={String(liqCount)} />
          <Card k={t('dash.adlQueue')} v={String(adlCount)} />
          <Card k={t('dash.serviceHealth')} v={`${upSvc}/${svcRows.length}`} />
        </div>
        {ld?.reconciled === false && (
          <p className="muted">{t('dash.ledgerNote')}</p>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>{t('dash.pendingWithdrawTitle', { n: Math.min(pendingWd.length, 5) })}</h2>
          <a className="btn" href="#/deposits">
            {t('dash.goReview')}
          </a>
        </div>
        {pendingWd.length === 0 ? (
          <div className="muted">{t('dash.noPending')}</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>{t('col.userId')}</th>
                  <th>{t('col.coin')}</th>
                  <th>{t('col.amount')}</th>
                  <th>{t('col.address')}</th>
                </tr>
              </thead>
              <tbody>
                {pendingWd.slice(0, 5).map((w) => (
                  <tr key={w.id}>
                    <td>{w.id}</td>
                    <td>{w.user_id}</td>
                    <td>{w.coin}</td>
                    <td>{w.amount}</td>
                    <td>{w.address}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel">
        <h2>{t('dash.serviceHealth')}</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t('col.service')}</th>
                <th>{t('col.status')}</th>
                <th>{t('col.latency')}</th>
              </tr>
            </thead>
            <tbody>
              {svcRows.map((s) => (
                <tr key={s.name}>
                  <td>{s.name}</td>
                  <td>
                    <span className={s.status === "up" ? "ann-state on" : "ann-state off"}>
                      {s.status === "up" ? t('common.normal') : t('common.abnormal')}
                    </span>
                  </td>
                  <td>{s.latency_ms ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
