import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useAuth, hasPerm } from "../lib/auth";
import { cn } from "../lib/utils";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Badge } from "../components/ui/badge";
import { StatusBadge } from "../components/ui/status-badge";
import { Alert } from "../components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../components/ui/card";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../components/ui/table";
import { Eye, Shield, ShieldOff, Search, RefreshCw } from "lucide-react";
import { MaskedText } from "../lib/mask";

interface C2COrder {
  id: number;
  side: string;
  coin: string;
  amount: number;
  price: number;
  total: number;
  user_id: number;
  status: string;
  createdAt: string;
}

const STATUS_TONE: Record<string, "success" | "warning" | "neutral" | "info" | "danger"> = {
  open: "info",
  locked: "warning",
  completed: "success",
  cancelled: "neutral",
  disputed: "danger",
};

export function C2C() {
  const { t } = useI18n();
  const { perms } = useAuth();
  const canManage = hasPerm(perms, "c2c:manage");
  const canView = hasPerm(perms, "c2c:view");

  const [orders, setOrders] = useState<C2COrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [filterSide, setFilterSide] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCoin, setFilterCoin] = useState("");
  const [searchUid, setSearchUid] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 30;

  const load = async () => {
    setLoading(true);
    setError(null);
    setMsg(null);
    try {
      const qs: Record<string, string | number> = { limit, offset: (page - 1) * limit };
      if (searchUid) qs.user_id = searchUid;
      if (filterSide) qs.side = filterSide;
      if (filterStatus) qs.status = filterStatus;
      if (filterCoin) qs.coin = filterCoin;
      const data = await api.get<{ orders: C2COrder[]; total: number }>(
        "/api/admin/c2c/orders" + qstr(qs)
      );
      // 后端以 created_at 交付，前端展示字段为 createdAt。
      const orders = (data.orders ?? []).map((o) => ({
        ...o,
        createdAt: o.createdAt ?? (o as any).created_at ?? "",
      }));
      setOrders(orders);
      setTotal(data.total ?? orders.length);
    } catch (e: any) {
      setError(e?.message ?? t("common.queryFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleAction = async (id: number, action: "freeze" | "release" | "complete") => {
    setMsg(null);
    try {
      if (action === "freeze") {
        await api.post(`/api/admin/c2c/orders/${id}/freeze`, {});
        setMsg(`订单 #${id} 已冻结`);
      } else if (action === "release") {
        await api.post(`/api/admin/c2c/orders/${id}/release`, {});
        setMsg(`订单 #${id} 已解冻`);
      } else {
        await api.post(`/api/admin/c2c/orders/${id}/complete`, {});
        setMsg(`订单 #${id} 已完结`);
      }
      load();
    } catch (e: any) {
      setMsg(e?.message ?? t("common.opFailed"));
    }
  };

  const stats = {
    open: orders.filter((o) => o.status === "open").length,
    locked: orders.filter((o) => o.status === "locked").length,
    disputed: orders.filter((o) => o.status === "disputed").length,
    totalVol: orders.reduce((s, o) => s + o.total, 0),
  };

  if (!canView) {
    return (
      <div className="space-y-3">
        <h1 className="text-lg font-semibold">{t("c2c.title")}</h1>
        <Alert variant="error">无 C2C 查看权限（需 c2c:view）</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">{t("c2c.title")}</h1>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className="h-3.5 w-3.5" />
          {t("common.refresh")}
        </Button>
      </div>

      {/* 统计卡 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label={t("c2c.statOpen")} value={stats.open} tone="info" />
        <StatCard label={t("c2c.statLocked")} value={stats.locked} tone="warning" />
        <StatCard label={t("c2c.statDisputed")} value={stats.disputed} tone="destructive" />
        <StatCard label={t("c2c.statVol")} value={stats.totalVol.toFixed(2)} tone="success" suffix="USDT" />
      </div>

      {error && <Alert variant="error">{error}</Alert>}
      {msg && <Alert variant="info">{msg}</Alert>}

      {/* 筛选栏 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t("c2c.filterTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-40">
              <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("c2c.uidPh")}
                value={searchUid}
                onChange={(e) => setSearchUid(e.target.value)}
                className="pl-8 h-8"
              />
            </div>
            <Select value={filterSide} onChange={(e) => setFilterSide(e.target.value)}>
              <option value="">全部方向</option>
              <option value="buy">买入 Buy</option>
              <option value="sell">卖出 Sell</option>
            </Select>
            <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">全部状态</option>
              <option value="open">挂单 Open</option>
              <option value="locked">锁定 Locked</option>
              <option value="completed">已完成 Completed</option>
              <option value="cancelled">已取消 Cancelled</option>
              <option value="disputed">纠纷 Disputed</option>
            </Select>
            <Input
              placeholder="币种 (USDT)"
              value={filterCoin}
              onChange={(e) => setFilterCoin(e.target.value)}
              className="h-8 w-28"
            />
            <Button size="sm" onClick={() => { setPage(1); load(); }}>
              {t("common.query")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 订单表格 */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>{t("c2c.listTitle")}（{total} 条）</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>{t("col.userId")}</TableHead>
                <TableHead>{t("col.type")}</TableHead>
                <TableHead>{t("col.coin")}</TableHead>
                <TableHead>{t("col.amount")}</TableHead>
                <TableHead>{t("col.price")}</TableHead>
                <TableHead>{t("col.amount")}</TableHead>
                <TableHead>{t("col.status")}</TableHead>
                <TableHead>{t("col.time")}</TableHead>
                <TableHead>{t("col.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                    {t("common.loading")}
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                    {t("c2c.noOrders")}
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="num font-medium">{o.id}</TableCell>
                    <TableCell className="num text-muted-foreground">{o.user_id}</TableCell>
                    <TableCell>
                      <Badge variant={o.side === "buy" ? "default" : "destructive"} className="text-xs">
                        {o.side === "buy" ? t("common.buy") : t("common.sell")}
                      </Badge>
                    </TableCell>
                    <TableCell className="num">{o.coin}</TableCell>
                    <TableCell className="num"><MaskedText value={o.amount.toFixed(4)} mask="balance" /></TableCell>
                    <TableCell className="num"><MaskedText value={o.price.toFixed(2)} mask="balance" /></TableCell>
                    <TableCell className="num font-semibold"><MaskedText value={o.total.toFixed(2)} mask="balance" /></TableCell>
                    <TableCell>
                      <StatusBadge tone={STATUS_TONE[o.status] ?? "neutral"}>
                        {t(`c2c.st.${o.status}`) ?? o.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="num text-muted-foreground text-xs">{o.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          title={t("c2c.actionView")}
                          onClick={() => {}}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        {o.status === "open" && canManage && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-warning"
                              title={t("c2c.actionFreeze")}
                              onClick={() => handleAction(o.id, "freeze")}
                            >
                              <Shield className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-success"
                              title={t("c2c.actionComplete")}
                              onClick={() => handleAction(o.id, "complete")}
                            >
                              <ShieldOff className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {o.status === "locked" && canManage && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-success"
                            title={t("c2c.actionRelease")}
                            onClick={() => handleAction(o.id, "release")}
                          >
                            <ShieldOff className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* 分页 */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {t("common.pageNav", { page, pages: Math.ceil(total / limit), total })}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("common.prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * limit >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
  suffix,
}: {
  label: string;
  value: number | string;
  tone: "success" | "warning" | "destructive" | "info";
  suffix?: string;
}) {
  const tones: Record<string, string> = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    info: "text-info",
  };
  return (
    <Card>
      <CardContent className="pt-3 pb-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-xl font-bold num", tones[tone])}>
          {value}
          {suffix && <span className="text-xs font-normal text-muted-foreground ml-1">{suffix}</span>}
        </p>
      </CardContent>
    </Card>
  );
}

function qstr(params: Record<string, string | number>): string {
  const us = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    us.set(k, String(v));
  }
  const s = us.toString();
  return s ? `?${s}` : "";
}
