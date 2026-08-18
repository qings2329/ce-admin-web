import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth, hasPerm } from "../lib/auth";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";

const STATUSES = ["", "pending", "approved", "rejected"];

export function Deposits() {
  const { perms } = useAuth();
  const canApprove = hasPerm(perms, "withdraw:approval");
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

  // 翻页 / 调整每页条数触发查询；挂载时也会拉取首屏。
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

  return (
    <div className="page">
      <h1>{t('deposits.title')}</h1>
      {msg && <div className="alert-info">{msg}</div>}

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
        }}
      >
        <input
          placeholder={t('deposits.userIdPh')}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <input
          placeholder={t('deposits.coinPh')}
          value={coin}
          onChange={(e) => setCoin(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "" ? t('common.allStatus') : s}
            </option>
          ))}
        </select>
        <button className="btn" type="submit">
          {t('deposits.query')}
        </button>
      </form>

      <ApiTable
        title={t('deposits.depositTitle')}
        rows={deposits}
        loading={loading}
        error={error}
        onReload={runQuery}
        columns={[
          { key: "id", label: "ID" },
          { key: "user_id", label: t('col.userId') },
          { key: "coin", label: t('col.coin') },
          { key: "chain", label: t('col.chain') },
          { key: "amount", label: t('col.amount') },
          { key: "tx_hash", label: t('col.txHash') },
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
          { key: "id", label: "ID" },
          { key: "user_id", label: t('col.userId') },
          { key: "coin", label: t('col.coin') },
          { key: "chain", label: t('col.chain') },
          { key: "amount", label: t('col.amount') },
          { key: "address", label: t('col.withdrawAddr') },
          { key: "status", label: t('col.status') },
          { key: "time", label: t('col.time') },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) =>
              row.status === "pending" ? (
                canApprove ? (
                  <span>
                    <button className="btn" onClick={() => decide(row.id, true)}>
                      {t('deposits.approve')}
                    </button>{" "}
                    <button className="btn" onClick={() => decide(row.id, false)}>
                      {t('deposits.reject')}
                    </button>
                  </span>
                ) : (
                  <span className="muted">{t('deposits.noApprovePerm')}</span>
                )
              ) : (
                <span className="muted">{t('deposits.handled')}</span>
              ),
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
    </div>
  );
}
