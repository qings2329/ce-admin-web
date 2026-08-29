import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Alert } from "../components/ui/alert";
import { DestructiveActionGuard } from "../components/ui/DestructiveActionGuard";
import { StatusBadge } from "../components/ui/status-badge";
import { Modal } from "../components/ui/Modal";

const LEVELS = ["info", "warning", "maintenance"] as const;

function levelTone(level: string): "success" | "warning" | "info" | "neutral" {
  if (level === "warning") return "warning";
  if (level === "maintenance") return "info";
  if (level === "info") return "success";
  return "neutral";
}

export function Notifications() {
  const { t } = useI18n();
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } = usePaged(
    (p) => api.listNotifications(p).then((d) => ({ items: d.items ?? [], total: d.total ?? 0 })),
  );
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [level, setLevel] = useState<string>("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const openCreate = () => {
    setLevel("info");
    setTitle("");
    setBody("");
    setMsg(null);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!title.trim()) {
      setMsg(t("ntf.titleRequired"));
      return;
    }
    setSubmitting(true);
    try {
      await api.createNotification({ level, title, body });
      setShowForm(false);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t("common.saveFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.deleteNotification(id);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t("common.deleteFailed"));
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">{t("ntf.title")}</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {msg && <Alert variant="info">{msg}</Alert>}

      <Button onClick={openCreate} className="mb-3">
        {t("ntf.publishBtn")}
      </Button>

      <Modal
        open={showForm}
        title={t("ntf.publishBtn")}
        onClose={() => setShowForm(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={(e: any) => submit(e)} disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("ntf.publishBtn")}
            </Button>
          </>
        }
        size="md"
      >
        <form onSubmit={submit} className="space-y-4">
          <Select value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </Select>
          <Input placeholder={t("ntf.titlePh")} value={title} onChange={(e) => setTitle(e.target.value)} />
          <textarea
            placeholder={t("ntf.bodyPh")}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-y"
          />
        </form>
      </Modal>

      <ApiTable
        title={t("ntf.listTitle")}
        rows={items}
        loading={loading}
        error={error}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: "ID", mono: true },
          {
            key: "level",
            label: t("col.level"),
            render: (r: any) => <StatusBadge tone={levelTone(r.level)}>{r.level}</StatusBadge>,
          },
          { key: "title", label: t("col.title") },
          { key: "body", label: t("col.body") },
          {
            key: "source",
            label: t("ntf.source"),
            render: (r: any) =>
              r.source === "live" ? (
                <StatusBadge tone="success">{t("ntf.sourceLive")}</StatusBadge>
              ) : (
                <span className="text-xs text-muted-foreground">{t("ntf.sourceLocal")}</span>
              ),
          },
          { key: "created_at", label: t("col.publishedAt"), render: (row: any) => formatDateTime(row.created_at) },
          {
            key: "op",
            label: t("col.actions"),
            render: (row: any) =>
              row.source === "live" ? (
                <span className="text-xs text-muted-foreground">—</span>
              ) : (
                <DestructiveActionGuard
                  confirmText={String(row.title || row.id)}
                  confirmLabel={t("common.delete")}
                  onConfirm={async () => {
                    await remove(row.id);
                  }}
                  trigger={
                    <Button variant="destructive" size="sm" className="border-dashed">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t("common.delete")}
                    </Button>
                  }
                />
              ),
          },
        ]}
      />
    </div>
  );
}
