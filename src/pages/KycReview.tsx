import { useState } from "react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { StatusBadge } from "../components/ui/status-badge";
import { Alert } from "../components/ui/alert";
import { ReviewDrawer, type ReviewItem } from "../components/drawer/ReviewDrawer";

export function KycReview() {
  const { t } = useI18n();
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) => api.listKycReviews(p));

  const [drawerItem, setDrawerItem] = useState<ReviewItem | null>(null);
  const [drawerIndex, setDrawerIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

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
    await api.approveKyc(id);
    reload();
  };

  const handleReject = async (id: number, reason: string) => {
    await api.rejectKyc(id, reason);
    reload();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("review.title")}</h1>
        <span className="text-xs text-muted-foreground">{t("review.hint")}</span>
      </div>
      {error && <Alert variant="error">{error}</Alert>}
      {toast && <Alert variant="info" className="animate-pulse">{toast}</Alert>}

      <ApiTable
        title={t("review.listTitle")}
        rows={items}
        loading={loading}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: "ID", render: (r: any) => <span className="num">{r.id}</span> },
          { key: "user_id", label: t("col.userId"), render: (r: any) => <span className="num">{r.user_id}</span> },
          { key: "kyc_level", label: t("review.kycLevel"), render: (r: any) => <StatusBadge tone="warning">{r.kyc_level ?? "KYC2"}</StatusBadge> },
          { key: "full_name", label: t("review.fullName"), render: (r: any) => <span>{r.full_name ?? "—"}</span> },
          { key: "country", label: t("col.chain"), render: (r: any) => <span>{r.country ?? "—"}</span> },
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
                  {t('review.review')}
                </Button>
              );
            },
          },
        ]}
      />

      {drawerItem && (
        <ReviewDrawer
          type="kyc"
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
