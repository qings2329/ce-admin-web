import { useI18n } from "../i18n";

interface PagerProps {
  total: number;
  limit: number;
  page: number;
  onChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  limits?: number[];
}

// Pager：上一页/下一页 + 页码信息 + 每页条数选择（可选）。
export function Pager({ total, limit, page, onChange, onLimitChange, limits }: PagerProps) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <div className="pager">
      {onLimitChange && (
        <select
          className="pager-limit"
          value={limit}
          onChange={(e) => onLimitChange(parseInt(e.target.value, 10))}
        >
          {(limits ?? [10, 20, 50, 100]).map((n) => (
            <option key={n} value={n}>
              {t('common.perPage', { n })}
            </option>
          ))}
        </select>
      )}
      <button className="btn" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        {t('common.prev')}
      </button>
      <span className="pager-info">
        {t('common.pageNav', { page, pages, total })}
      </span>
      <button className="btn" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        {t('common.next')}
      </button>
    </div>
  );
}
