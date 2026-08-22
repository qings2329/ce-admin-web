import { useState } from "react";
import { useI18n } from "../i18n";
import { formatDateTime } from "../lib/timezone";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";

const LEVELS = ["info", "warning", "maintenance"] as const;

// 运营通知：list 为实时聚合（notification 服务 live 项 + 管理后台本地公告）；
// 仅本地公告可创建/删除，live 项只读。
export function Notifications() {
  const { t } = useI18n();
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } = usePaged(
    (p) => api.listNotifications(p).then((d) => ({ items: d.items ?? [], total: d.total ?? 0 })),
  );
  const [level, setLevel] = useState<string>("info");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!title.trim()) {
      setMsg(t("ntf.titleRequired"));
      return;
    }
    try {
      await api.createNotification({ level, title, body });
      setTitle("");
      setBody("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t("common.saveFailed"));
    }
  };

  const remove = async (id: number) => {
    if (!confirm(t("ntf.deleteConfirm"))) return;
    try {
      await api.deleteNotification(id);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t("common.deleteFailed"));
    }
  };

  return (
    <div className="page">
      <h1>{t("ntf.title")}</h1>
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
        <input placeholder={t("ntf.titlePh")} value={title} onChange={(e) => setTitle(e.target.value)} />
        <input placeholder={t("ntf.bodyPh")} value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn" type="submit">
          {t("ntf.publishBtn")}
        </button>
      </form>

      <ApiTable
        title={t("ntf.listTitle")}
        rows={items}
        loading={loading}
        error={error}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: "ID" },
          {
            key: "level",
            label: t("col.level"),
            render: (r: any) => <span className={`ann-badge ${r.level}`}>{r.level}</span>,
          },
          { key: "title", label: t("col.title") },
          { key: "body", label: t("col.body") },
          {
            key: "source",
            label: t("ntf.source"),
            render: (r: any) =>
              r.source === "live" ? (
                <span className="ann-state on">{t("ntf.sourceLive")}</span>
              ) : (
                <span>{t("ntf.sourceLocal")}</span>
              ),
          },
          { key: "created_at", label: t("col.publishedAt"), render: (row: any) => formatDateTime(row.created_at) },
          {
            key: "op",
            label: t("col.actions"),
            render: (row: any) =>
              row.source === "live" ? (
                <span className="muted">—</span>
              ) : (
                <button className="btn btn-danger" onClick={() => remove(row.id)}>
                  {t("common.delete")}
                </button>
              ),
          },
        ]}
      />
    </div>
  );
}
