// 从当前 hash 路由（`#/path?k=v`）读取查询参数。
export function routeSearch(): URLSearchParams {
  const qs = location.hash.split("?")[1] ?? "";
  return new URLSearchParams(qs);
}

export function routeParam(key: string): string {
  return (routeSearch().get(key) ?? "").trim();
}
