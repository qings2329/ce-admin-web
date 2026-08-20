import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useI18n } from "../i18n";

interface Commission {
  id: number;
  referrer_id: number;
  taker_id: number;
  asset: string;
  amount: number;
  rate: number;
  status: number;
  biz_ref: string;
  created_at: string;
  updated_at: string;
}

export function ReferralAdmin() {
  const { t } = useI18n();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 50;

  const load = async (offset: number) => {
    try {
      const d = await api.get<{ commissions: Commission[]; total: number }>(
        `/api/admin/referral/commissions?limit=${limit}&offset=${offset}`
      );
      setCommissions(d.commissions ?? []);
      setTotal(d.total ?? 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => { load(page * limit); }, [page]);

  const maxPage = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="page">
      <h2>{t("referral.adminTitle")}</h2>
      <p style={{ color: "var(--text-muted)", marginBottom: 16 }}>
        {t("referral.adminDesc")}
      </p>
      <table className="tbl" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>{t("referral.adminReferrer")}</th>
            <th>{t("referral.adminTaker")}</th>
            <th>{t("referral.asset")}</th>
            <th>{t("referral.amount")}</th>
            <th>{t("referral.rate")}</th>
            <th>{t("referral.status")}</th>
            <th>{t("referral.time")}</th>
          </tr>
        </thead>
        <tbody>
          {commissions.length === 0 ? (
            <tr><td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)" }}>{t("common.noData")}</td></tr>
          ) : commissions.map((c) => (
            <tr key={c.id}>
              <td>{c.id}</td>
              <td>{c.referrer_id}</td>
              <td>{c.taker_id}</td>
              <td>{c.asset}</td>
              <td>{(c.amount / 1e6).toFixed(6)}</td>
              <td>{(c.rate * 100).toFixed(1)}%</td>
              <td>{c.status === 1 ? t("referral.confirmed") : t("referral.pending")}</td>
              <td>{c.created_at ? new Date(c.created_at).toLocaleString() : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="pagination" style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <button disabled={page <= 0} onClick={() => setPage(page - 1)}>{t("common.prev")}</button>
        <span>{t("common.pageInfo", { page: page + 1, total: maxPage, count: total })}</span>
        <button disabled={page >= maxPage - 1} onClick={() => setPage(page + 1)}>{t("common.next")}</button>
      </div>
    </div>
  );
}
