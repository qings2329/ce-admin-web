import { useCallback, useEffect, useRef, useState } from "react";

export interface Paged<T> {
  items: T[];
  total: number;
}

// usePaged：拉取分页列表。fn 接收 {limit, offset} 并返回 {items, total}。
// 管理 page/limit/items/total/loading/error，并提供 changePage/changeLimit。
export function usePaged<T>(
  fn: (params: { limit: number; offset: number }) => Promise<Paged<T>>,
  initialLimit = 20,
) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(initialLimit);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fnRef
      .current({ limit, offset: (page - 1) * limit })
      .then((d) => {
        setItems(d.items ?? []);
        setTotal(d.total ?? 0);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? String(e));
        setLoading(false);
      });
  }, [limit, page]);

  useEffect(() => {
    load();
  }, [load]);

  return {
    items,
    total,
    limit,
    page,
    loading,
    error,
    reload: load,
    changePage: setPage,
    changeLimit: (l: number) => {
      setLimit(l);
      setPage(1);
    },
  };
}
