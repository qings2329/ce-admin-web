import { type ReactNode } from "react";
import { useI18n } from "../i18n";

interface Column {
  key: string;
  label?: string;
  render?: (row: any) => ReactNode;
}

interface ApiTableProps {
  title: string;
  rows: any[];
  columns?: Column[];
  loading?: boolean;
  error?: string | null;
  onReload?: () => void;
  actions?: ReactNode;
  emptyText?: string;
}

// 通用数据表：传入数组与可选列定义，自动从首行推断列；支持加载/错误/刷新/操作区。
export function ApiTable({
  title,
  rows,
  columns,
  loading,
  error,
  onReload,
  actions,
  emptyText,
}: ApiTableProps) {
  const { t } = useI18n();
  const resolvedEmptyText = emptyText ?? t('common.noData');
  const cols: Column[] =
    columns ??
    (rows.length > 0
      ? Object.keys(rows[0]).map((k) => ({ key: k, label: k }))
      : []);

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>{title}</h2>
        <div className="panel-actions">
          {actions}
          {onReload && (
            <button className="btn" onClick={onReload}>
              {t('common.refresh')}
            </button>
          )}
        </div>
      </div>
      {error && <div className="alert-error">{error}</div>}
      {loading && <div className="muted">{t('common.loading')}</div>}
      {!loading && !error && rows.length === 0 && <div className="muted">{resolvedEmptyText}</div>}
      {!loading && !error && rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {cols.map((c) => (
                  <th key={c.key}>{c.label ?? c.key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id ?? row.symbol ?? row.name ?? i}>
                  {cols.map((c) => (
                    <td key={c.key}>
                      {c.render ? c.render(row) : formatVal(row[c.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function formatVal(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
