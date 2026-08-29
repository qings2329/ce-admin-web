import { useState } from "react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useAuth, hasPerm } from "../lib/auth";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/ui/status-badge";
import { Alert } from "../components/ui/alert";
import { ReviewDrawer, type ReviewItem } from "../components/drawer/ReviewDrawer";
import { MaskedText, maskHash } from "../lib/mask";

export function LargeWithdrawalReview() {
  const { t } = useI18n();
  const { perms } = useAuth();
  const canReview = hasPerm(perms, "finance:approve");
  const [toast, setToast] = useState<string | null>(null);

  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) => api.listPendingWithdrawals(p));

  const [drawerItem, setDrawerItem] = useState<ReviewItem | null>(null);
  const [drawerIndex, setDrawerIndex] = useState(0);

  const openDrawer = (idx: number) => {
    setDrawerItem(items[idx]);
    setDrawerIndex(idx);
  };

  const closeDrawer = () => {
    setDrawerItem(null);
  };

  const navigate = (idx: number) => {
    setDrawerItem(items[idx]);
    setDrawerIndex(idx);
  };

  const handleApprove = async (id: number) => {
    await api.approveWithdrawalManual(id);
    reload();
  };

  const handleReject = async (id: number, reason: string) => {
    await api.rejectWithdrawalManual(id, reason);
    reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("withdrawreview.title")}</h1>
        {!canReview && <span className="text-xs text-destructive">{t("withdrawreview.noPerm")}</span>}
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {toast && <Alert variant="info" className="animate-pulse">{toast}</Alert>}

      {!canReview ? (
        <Alert variant="warn" className="text-xs">{t("withdrawreview.noPerm")}</Alert>
      ) : (
        <ApiTable
          title={t("withdrawreview.listTitle")}
          rows={items}
          loading={loading}
          onReload={reload}
          actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
          columns={[
            { key: "id", label: "ID", render: (r: any) => <span className="num">{r.id}</span> },
            { key: "user_id", label: t("col.userId"), render: (r: any) => <span className="num">{r.user_id}</span> },
            { key: "coin", label: t("col.coin"), render: (r: any) => <StatusBadge tone="neutral">{r.coin}</StatusBadge> },
            {
              key: "amount",
              label: t("col.amount"),
              render: (r: any) => <span className="num font-semibold"><MaskedText value={r.amount} mask="balance" /></span>,
            },
            { key: "chain", label: t("col.chain"), render: (r: any) => <span>{r.chain ?? "—"}</span> },
            {
              key: "address",
              label: t("col.withdrawAddr"),
              render: (r: any) => <span className="num text-muted-foreground text-xs max-w-[160px] truncate"><MaskedText value={r.address} mask={maskHash} /></span>,
            },
            {
              key: "submitted_at",
              label: t("col.time"),
              render: (r: any) => <span className="num text-muted-foreground text-xs">{new Date(r.submitted_at).toLocaleString()}</span>,
            },
          {
            key: "op",
            label: t('col.actions'),
            render: (r: any) => {
              const idx = items.findIndex((item: any) => item.id === r.id);
              return (
                <Button size="sm" variant="outline" onClick={() => openDrawer(idx >= 0 ? idx : 0)}>
                  {t('withdrawreview.review')}
                </Button>
              );
            },
          },
          ]}
        />
      )}

      {drawerItem && canReview && (
        <ReviewDrawer
          type="withdrawal"
          item={drawerItem}
          allItems={items}
          currentIndex={drawerIndex}
          onClose={closeDrawer}
          onNavigate={navigate}
          onApprove={handleApprove}
          onReject={handleReject}
          toast={(msg) => { setToast(msg); setTimeout(() => setToast(null), 2500); }}
        />
      )}
    </div>
  );
}
