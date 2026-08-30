import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth, hasPerm } from "../lib/auth";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Alert } from "../components/ui/alert";
import { ReviewDrawer, type ReviewItem } from "../components/drawer/ReviewDrawer";
import { cn } from "../lib/utils";
import { MaskedText, maskHash } from "../lib/mask";

const STATUSES = ["", "pending", "approved", "rejected"];

export function Deposits() {
  const { perms } = useAuth();
  const canApprove = hasPerm(perms, "finance:approve");
  const { t } = useI18n();

  const [userId, setUserId] = useState("");
  const [coin, setCoin] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositsTotal, setDepositsTotal] = useState(0);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawalsTotal, setWithdrawalsTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drawerItem, setDrawerItem] = useState<ReviewItem | null>(null);
  const [drawerIndex, setDrawerIndex] = useState(0);

  const runQuery = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const params: any = { limit, offset: (page - 1) * limit };
      if (userId.trim()) params.user_id = userId.trim();
      if (coin.trim()) params.coin = coin.trim();
      if (status) params.status = status;
      const [d, w] = await Promise.all([
        api.listDeposits(params),
        api.listWithdrawals(params),
      ]);
      setDeposits(d.deposits ?? []);
      setDepositsTotal(d.total ?? 0);
      setWithdrawals(w.withdrawals ?? []);
      setWithdrawalsTotal(w.total ?? 0);
    } catch (e: any) {
      setError(e?.message ?? t('common.queryFailed'));
      setDeposits([]);
      setDepositsTotal(0);
      setWithdrawals([]);
      setWithdrawalsTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runQuery();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const decide = async (id: number | string, approve: boolean) => {
    setMsg(null);
    try {
      if (approve) await api.approveWithdrawal(id);
      else await api.rejectWithdrawal(id);
      runQuery();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    }
  };

  const openDrawer = (idx: number) => {
    setDrawerItem(withdrawals[idx]);
    setDrawerIndex(idx);
  };

  const closeDrawer = () => setDrawerItem(null);

  const navigate = (idx: number) => {
    setDrawerItem(withdrawals[idx]);
    setDrawerIndex(idx);
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">{t('deposits.title')}</h1>
      {msg && <Alert variant="info">{msg}</Alert>}
      {toast && <Alert variant="info" className="animate-pulse">{toast}</Alert>}

      <form
        className="flex flex-wrap items-center gap-2 mb-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
      >
        <Input
          placeholder={t('deposits.userIdPh')} className="max-w-xs"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <Input
          placeholder={t('deposits.coinPh')} className="max-w-xs"
          value={coin}
          onChange={(e) => setCoin(e.target.value)}
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "" ? t('common.allStatus') : s}
            </option>
          ))}
        </Select>
        <Button type="submit">{t('deposits.query')}</Button>
      </form>

      <ApiTable
        title={t('deposits.depositTitle')}
        rows={deposits}
        loading={loading}
        error={error}
        onReload={runQuery}
        columns={[
          { key: "id", label: "ID", mono: true },
          { key: "user_id", label: t('col.userId'), mono: true },
          { key: "coin", label: t('col.coin') },
          { key: "chain", label: t('col.chain') },
          { key: "amount", label: t('col.amount'), mono: true, render: (r: any) => <MaskedText value={r.amount} mask="balance" /> },
          { key: "tx_hash", label: t('col.txHash'), mono: true, render: (r: any) => <MaskedText value={r.tx_hash} mask={maskHash} /> },
          { key: "status", label: t('col.status') },
          { key: "time", label: t('col.time') },
        ]}
      />
      {depositsTotal > 0 && (
        <Pager
          total={depositsTotal}
          limit={limit}
          page={page}
          onChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      )}

      <ApiTable
        title={t('deposits.withdrawTitle')}
        rows={withdrawals}
        loading={loading}
        error={error}
        onReload={runQuery}
        columns={[
          { key: "id", label: "ID", mono: true },
          { key: "user_id", label: t('col.userId'), mono: true },
          { key: "coin", label: t('col.coin') },
          { key: "chain", label: t('col.chain') },
          {
            key: "amount",
            label: t('col.amount'),
            render: (r: any) => <span className={cn("num font-semibold", (r.amount ?? 0) >= 100000 ? "text-warning" : "")}><MaskedText value={r.amount} mask="balance" /></span>,
          },
          { key: "address", label: t('col.withdrawAddr'), mono: true, render: (r: any) => <MaskedText value={r.address} mask={maskHash} /> },
          { key: "status", label: t('col.status') },
          { key: "time", label: t('col.time') },
          {
            key: "op",
            label: t('col.actions'),
            render: (r: any) => {
              const idx = withdrawals.findIndex((w: any) => w.id === r.id);
              return withdrawals[idx]?.status === "pending" ? (
                canApprove ? (
                  <span className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openDrawer(idx >= 0 ? idx : 0)}>
                      {t('deposits.review')}
                    </Button>
                    <Button size="sm" onClick={() => decide(r.id, true)}>
                      {t('deposits.approve')}
                    </Button>
                    <Button size="sm" onClick={() => decide(r.id, false)}>
                      {t('deposits.reject')}
                    </Button>
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">{t('deposits.noApprovePerm')}</span>
                )
              ) : (
                <span className="text-xs text-muted-foreground">{t('deposits.handled')}</span>
              );
            },
          },
        ]}
      />
      {withdrawalsTotal > 0 && (
        <Pager
          total={withdrawalsTotal}
          limit={limit}
          page={page}
          onChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
        />
      )}

      {drawerItem && canApprove && (
        <ReviewDrawer
          type="withdrawal"
          item={drawerItem}
          allItems={withdrawals as ReviewItem[]}
          currentIndex={drawerIndex}
          onClose={closeDrawer}
          onNavigate={navigate}
          onApprove={async (id) => { await decide(id, true); closeDrawer(); }}
          onReject={async (id) => { await decide(id, false); closeDrawer(); }}
          toast={(m) => { setToast(m); setTimeout(() => setToast(null), 2500); }}
        />
      )}
    </div>
  );
}
