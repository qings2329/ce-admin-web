import { useFetch } from "../lib/useFetch";
import { api } from "../api/client";
import { useI18n } from "../i18n";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
import { StatusBadge } from "../components/ui/status-badge";
import { Alert } from "../components/ui/alert";
import { Button } from "../components/ui/button";

function Kv({ k, v, hint }: { k: string; v: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex flex-col gap-1.5">
      <span className="text-xs text-muted-foreground">{k}</span>
      <span className="text-base font-semibold num">{v}</span>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
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
  const wdRows = (withdrawals.data?.withdrawals ?? []) as any[];
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
    <div className="space-y-4">
      <h1 className="text-lg font-semibold mb-3">{t('dash.title')}</h1>
      {err && <Alert variant="error">{err}</Alert>}
      {loading && <p className="text-muted-foreground text-xs">{t('common.loading')}</p>}

      <Card>
        <CardHeader>
          <CardTitle>{t('dash.keyMetrics')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <Kv k={t('dash.usersTotal')} v={String(userCount)} />
            <Kv k={t('dash.pendingWithdraw')} v={String(pendingWd.length)} hint={t('dash.pendingWithdrawHint')} />
            <Kv k={t('dash.annCount')} v={String(annCount)} />
            <Kv
              k={t('dash.totalAssets')}
              v={ld ? String(ld.total_assets ?? "-") : "-"}
              hint={ld ? (ld.reconciled ? t('dash.reconciled') : t('dash.notReconciled')) : undefined}
            />
            <Kv k={t('dash.discrepancy')} v={ld ? String(ld.discrepancy ?? "-") : "-"} />
            <Kv k={t('dash.insuranceFund')} v={rk ? String(rk.insurance_fund ?? "-") : "-"} />
            <Kv k={t('dash.liqWarn')} v={String(liqCount)} />
            <Kv k={t('dash.adlQueue')} v={String(adlCount)} />
            <Kv k={t('dash.serviceHealth')} v={`${upSvc}/${svcRows.length}`} />
          </div>
          {ld?.reconciled === false && (
            <p className="text-muted-foreground text-xs mt-2">{t('dash.ledgerNote')}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('dash.pendingWithdrawTitle', { n: Math.min(pendingWd.length, 5) })}</CardTitle>
          <Button asChild variant="outline" size="sm">
            <a href="#/deposits">{t('dash.goReview')}</a>
          </Button>
        </CardHeader>
        <CardContent>
          {pendingWd.length === 0 ? (
            <p className="text-muted-foreground text-xs">{t('dash.noPending')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{t('col.userId')}</TableHead>
                  <TableHead>{t('col.coin')}</TableHead>
                  <TableHead>{t('col.amount')}</TableHead>
                  <TableHead>{t('col.address')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingWd.slice(0, 5).map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="num">{w.id}</TableCell>
                    <TableCell className="num">{w.user_id}</TableCell>
                    <TableCell>{w.coin}</TableCell>
                    <TableCell className="num">{w.amount}</TableCell>
                    <TableCell className="num">{w.address}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('dash.serviceHealth')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('col.service')}</TableHead>
                <TableHead>{t('col.status')}</TableHead>
                <TableHead>{t('col.latency')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {svcRows.map((s) => (
                <TableRow key={s.name}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    <StatusBadge tone={s.status === "up" ? "success" : "neutral"}>
                      {s.status === "up" ? t('common.normal') : t('common.abnormal')}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="num">{s.latency_ms ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
