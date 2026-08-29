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

export function Announcements() {
  const { t } = useI18n();
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) =>
      api.listAnnouncements(p).then((d) => ({ items: d.announcements ?? [], total: d.total ?? 0 })),
    );
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [level, setLevel] = useState<string>("info");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [active, setActive] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const resetForm = () => {
    setLevel("info");
    setTitle("");
    setContent("");
    setActive(true);
    setEditing(null);
    setMsg(null);
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (row: any) => {
    setEditing(row);
    setLevel(row.level ?? "info");
    setTitle(row.title ?? "");
    setContent(row.content ?? "");
    setActive(!!row.active);
    setMsg(null);
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!title.trim()) {
      setMsg(t('ann.titleRequired'));
      return;
    }
    setSubmitting(true);
    try {
      if (editing) {
        await api.updateAnnouncement(editing.id, { level, title, content, active });
      } else {
        await api.createAnnouncement({ level, title, content, active });
      }
      resetForm();
      setShowForm(false);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (id: number) => {
    try {
      await api.deleteAnnouncement(id);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.deleteFailed'));
    }
  };

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-xl font-semibold">{t('ann.title')}</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {msg && <Alert variant="info">{msg}</Alert>}

      <Button onClick={openCreate} className="mb-3">
        {t('ann.createBtn')}
      </Button>

      <Modal
        open={showForm}
        title={editing ? `${t('common.edit')} · ${t('ann.title')}` : t('ann.createBtn')}
        onClose={() => { resetForm(); setShowForm(false); }}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => { resetForm(); setShowForm(false); }}>
              {t('common.cancel')}
            </Button>
            <Button onClick={(e: any) => submit(e)} disabled={submitting} className="gap-1.5">
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {editing ? t('ann.saveBtn') : t('ann.createBtn')}
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
          <Input
            placeholder={t('ann.titlePh')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            placeholder={t('ann.bodyPh')}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-md border border-border bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring min-h-[80px] resize-y"
          />
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            {t('ann.publish')}
          </label>
        </form>
      </Modal>

      <ApiTable
        title={t('ann.listTitle')}
        rows={items}
        loading={loading}
        error={error}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: "ID", mono: true },
          {
            key: "level",
            label: t('col.level'),
            render: (r: any) => <StatusBadge tone={levelTone(r.level)}>{r.level}</StatusBadge>,
          },
          { key: "title", label: t('col.title') },
          { key: "content", label: t('col.body') },
          {
            key: "active",
            label: t('col.status'),
            render: (r: any) => (
              <StatusBadge tone={r.active ? "success" : "neutral"}>
                {r.active ? t('ann.published') : t('ann.draft')}
              </StatusBadge>
            ),
          },
          { key: "published_at", label: t('col.publishedAt'), render: (row: any) => formatDateTime(row.published_at) },
          { key: "updated_at", label: t('col.updatedAt'), render: (row: any) => formatDateTime(row.updated_at) },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <span className="flex items-center gap-2">
                <Button size="sm" onClick={() => startEdit(row)}>
                  {t('common.edit')}
                </Button>
                <DestructiveActionGuard
                  confirmText={String(row.title || row.id)}
                  confirmLabel={t('common.delete')}
                  onConfirm={async () => {
                    await remove(row.id);
                  }}
                  trigger={
                    <Button size="sm" variant="destructive" className="border-dashed">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t('common.delete')}
                    </Button>
                  }
                />
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
