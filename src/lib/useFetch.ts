import { useCallback, useEffect, useRef, useState } from "react";

// useFetch：挂载时自动加载 fn，返回 data/loading/error/reload。
// fn 通过 ref 持有，避免 fn 引用变化导致无限重渲染；页面按需调用 reload 刷新。
export function useFetch<T>(fn: () => Promise<T>) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    fnRef.current()
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e?.message ?? String(e));
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload };
}
