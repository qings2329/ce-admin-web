import { useEffect, useState } from "react";
import { api, type Commission } from "../api/client";
import { useI18n } from "../i18n";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import { StatusBadge, type StatusTone } from "../components/ui/status-badge";

export function ReferralAdmin() {
  const { t } = useI18n();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 50;

  const load = async (offset: number) => {
    try {
      const d = await api.getReferralCommissions({ limit, offset });
      setCommissions(d.commissions ?? []);
      setTotal(d.total ?? 0);
    } catch {
      // ignore
    }
  };

  useEffect(() => { load(page * limit); }, [page]);

  const maxPage = Math.max(1, Math.ceil(total / limit));

  const statusTone = (confirmed: boolean): StatusTone =>
    confirmed ? "success" : "warning";

  return (
    <div className="space-y-4">
      <h2 className="mb-3 text-base font-semibold">{t("referral.adminTitle")}</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        {t("referral.adminDesc")}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>{t("referral.adminReferrer")}</TableHead>
            <TableHead>{t("referral.adminTaker")}</TableHead>
            <TableHead>{t("referral.asset")}</TableHead>
            <TableHead>{t("referral.amount")}</TableHead>
            <TableHead>{t("referral.rate")}</TableHead>
            <TableHead>{t("referral.status")}</TableHead>
            <TableHead>{t("referral.time")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {commissions.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-muted-foreground">
                {t("common.noData")}
              </TableCell>
            </TableRow>
          ) : (
            commissions.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="num">{c.id}</TableCell>
                <TableCell className="num">{c.referrer_id}</TableCell>
                <TableCell className="num">{c.taker_id}</TableCell>
                <TableCell>{c.asset}</TableCell>
                <TableCell className="num">{(c.amount / 1e6).toFixed(6)}</TableCell>
                <TableCell className="num">{(c.rate * 100).toFixed(1)}%</TableCell>
                <TableCell>
                  <StatusBadge tone={statusTone(c.status === 1)}>
                    {c.status === 1 ? t("referral.confirmed") : t("referral.pending")}
                  </StatusBadge>
                </TableCell>
                <TableCell className="num">
                  {c.created_at ? new Date(c.created_at).toLocaleString() : "-"}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <div className="mt-3 flex items-center gap-2.5">
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 0}
          onClick={() => setPage(page - 1)}
        >
          {t("common.prev")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t("common.pageInfo", { page: page + 1, total: maxPage, count: total })}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= maxPage - 1}
          onClick={() => setPage(page + 1)}
        >
          {t("common.next")}
        </Button>
      </div>
    </div>
  );
}
