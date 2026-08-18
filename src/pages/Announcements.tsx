import { useState } from "react";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";

const LEVELS = ["info", "warning", "maintenance"] as const;

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
    <div className="page">
      <h1>{t('ann.title')}</h1>
      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form ann-form" onSubmit={submit}>
        <select value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <input
          placeholder={t('ann.titlePh')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder={t('ann.bodyPh')}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <label className="ann-active">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          {t('ann.publish')}
        </label>
        <button className="btn" type="submit">
          {editing ? t('ann.saveBtn') : t('ann.createBtn')}
        </button>
        {editing && (
          <button className="btn" type="button" onClick={resetForm}>
            {t('common.cancel')}
          </button>
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
          { key: "id", label: "ID" },
          {
            key: "level",
            label: t('col.level'),
            render: (r: any) => <span className={`ann-badge ${r.level}`}>{r.level}</span>,
          },
          { key: "title", label: t('col.title') },
          { key: "content", label: t('col.body') },
          {
            key: "active",
            label: t('col.status'),
            render: (r: any) => (
              <span className={r.active ? "ann-state on" : "ann-state off"}>
                {r.active ? t('ann.published') : t('ann.draft')}
              </span>
            ),
          },
          { key: "published_at", label: t('col.publishedAt'), render: (row: any) => formatDateTime(row.published_at) },
          { key: "updated_at", label: t('col.updatedAt'), render: (row: any) => formatDateTime(row.updated_at) },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <span>
                <button className="btn" onClick={() => startEdit(row)}>
                  {t('common.edit')}
                </button>{" "}
                <button className="btn btn-danger" onClick={() => remove(row.id)}>
                  {t('common.delete')}
                </button>
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
