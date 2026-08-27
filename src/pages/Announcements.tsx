import { useState } from "react";
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
import { StatusBadge } from "../components/ui/status-badge";

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!title.trim()) {
      setMsg(t('ann.titleRequired'));
      return;
    }
    try {
      if (editing) {
        await api.updateAnnouncement(editing.id, { level, title, content, active });
      } else {
        await api.createAnnouncement({ level, title, content, active });
      }
      resetForm();
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.saveFailed'));
    }
  };

  const startEdit = (row: any) => {
    setEditing(row);
    setLevel(row.level ?? "info");
    setTitle(row.title ?? "");
    setContent(row.content ?? "");
    setActive(!!row.active);
    setMsg(null);
  };

  const remove = async (id: number) => {
    if (!confirm(t('ann.deleteConfirm'))) return;
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

      <form className="flex flex-wrap items-center gap-2 mb-3" onSubmit={submit}>
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
        <Input
          placeholder={t('ann.bodyPh')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          {t('ann.publish')}
        </label>
        <Button type="submit">
          {editing ? t('ann.saveBtn') : t('ann.createBtn')}
        </Button>
        {editing && (
          <Button type="button" variant="outline" onClick={resetForm}>
            {t('common.cancel')}
          </Button>
        )}
      </form>

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
                <Button size="sm" variant="destructive" onClick={() => remove(row.id)}>
                  {t('common.delete')}
                </Button>
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
