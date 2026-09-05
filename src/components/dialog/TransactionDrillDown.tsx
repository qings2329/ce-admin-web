import { useEffect, useMemo, useState } from "react";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";
import { formatDateTime } from "../../lib/timezone";
import { CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { StatusBadge } from "../ui/status-badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../ui/table";
import { Alert } from "../ui/alert";
import { MaskedText, maskHash } from "../../lib/mask";
import { X, Loader2, Search, ArrowLeft } from "lucide-react";

interface DrillDownParams {
  type: "spike" | "symbol";
  label: string;
  timeRange?: string;
  symbol?: string;
  window?: { start: number; end: number };
}

interface DrillRow {
  id: string;
  user_id: number;
  coin: string;
  amount: number;
  tx_hash?: string;
  status: string;
  time: string;
}

function parseTimeMs(v: any): number {
  const t = new Date(v ?? 0).getTime();
  if (!t || Number.isNaN(t)) {
    const n = Number(v);
    return Number.isNaN(n) ? 0 : n >= 1e15 ? n / 1e9 : n;
  }
  return t;
}

function formatIso(v: any): string {
  const ms = parseTimeMs(v);
  return new Date(ms).toISOString();
}

interface TransactionDrillDownProps {
  params: DrillDownParams | null;
  rows?: DrillRow[];
  onClose: () => void;
}

export function TransactionDrillDown({ params, rows, onClose }: TransactionDrillDownProps) {
  const { t } = useI18n();
  const [localRows, setLocalRows] = useState<DrillRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterUid, setFilterUid] = useState("");

  useEffect(() => {
    if (!params) return;
    let alive = true;
    if (params.window) {
      const win = params.window;
      setLoading(true);
      setError(null);
      (async () => {
        try {
          const [depResp, wdResp] = await Promise.all([
            api.listDeposits({ limit: 1000 }),
            api.listWithdrawals({ limit: 1000 }),
          ]);
          if (!alive) return;
          const deps = (depResp.deposits ?? []).filter((d: any) => {
            const t = parseTimeMs(d.time ?? d.created_at);
            return t >= win.start && t <= win.end;
          });
          const wds = (wdResp.withdrawals ?? []).filter((w: any) => {
            const t = parseTimeMs(w.time ?? w.created_at);
            return t >= win.start && t <= win.end;
          });
          setLocalRows([
            ...deps.map((d: any) => ({
              id: d.id ?? d.tx_hash ?? String(d.user_id),
              user_id: d.user_id,
              coin: d.coin,
              amount: d.amount,
              tx_hash: d.tx_hash,
              status: d.status,
              time: formatIso(d.time ?? d.created_at),
            })),
            ...wds.map((w: any) => ({
              id: w.id ?? w.tx_hash ?? String(w.user_id),
              user_id: w.user_id,
              coin: w.coin,
              amount: w.amount,
              tx_hash: w.tx_hash,
              status: w.status,
              time: formatIso(w.time ?? w.created_at),
            })),
          ]);
          setLoading(false);
        } catch {
          if (alive) {
            setError("riskdash.drill.fetchError");
            setLoading(false);
          }
        }
      })();
      return () => {
        alive = false;
      };
    }
    if (rows && rows.length > 0) {
      setLocalRows(rows);
      setLoading(false);
      setError(null);
      return;
    }
    setLocalRows([]);
    setLoading(false);
    setError(null);
  }, [params, rows]);

  const displayRows = params?.window ? localRows : rows && rows.length > 0 ? rows : localRows;

  const filteredRows = useMemo(() => {
    let base = displayRows;
    if (params?.symbol) {
      const sym = params.symbol.toLowerCase();
      base = base.filter((r) => r.coin && sym.includes(r.coin.toLowerCase()));
    }
    if (!filterUid) return base;
    return base.filter((r) => String(r.user_id).includes(filterUid));
  }, [displayRows, filterUid, params]);

  if (!params) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col m-4">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <CardTitle className="text-sm">{t("riskdash.drill.title")}</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t(params.label, params.symbol ? { symbol: params.symbol } : undefined)}
                {params.timeRange && ` · ${params.timeRange}`}
                {params.symbol && ` · ${params.symbol}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={filterUid}
              onChange={(e) => setFilterUid(e.target.value)}
              placeholder={t("riskdash.drill.uidPh")}
              className="h-7 w-full rounded-md border border-input bg-background pl-8 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <Badge variant="secondary" className="text-[10px]">{filteredRows.length} {t("riskdash.drill.records")}</Badge>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {error && <Alert variant="error">{t(error)}</Alert>}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-10 text-center text-xs text-muted-foreground">{t("riskdash.drill.noData")}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>{t("col.userId")}</TableHead>
                  <TableHead>{t("col.coin")}</TableHead>
                  <TableHead>{t("col.amount")}</TableHead>
                  <TableHead>{t("col.txHash")}</TableHead>
                  <TableHead>{t("col.status")}</TableHead>
                  <TableHead>{t("col.time")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row: DrillRow) => (
                  <TableRow key={row.id}>
                    <TableCell className="num font-medium">{row.id}</TableCell>
                    <TableCell className="num text-muted-foreground">{row.user_id}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-[10px]">{row.coin}</Badge></TableCell>
                    <TableCell className="num font-semibold"><MaskedText value={`$${row.amount.toLocaleString()}`} mask="balance" /></TableCell>
                    <TableCell className="num text-muted-foreground text-[11px] max-w-[140px] truncate"><MaskedText value={row.tx_hash} mask={maskHash} /></TableCell>
                    <TableCell>
                      <StatusBadge tone={row.status === "completed" || row.status === "approved" ? "success" : row.status === "pending" ? "warning" : "danger"}>
                        {row.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="num text-muted-foreground text-[11px]">{formatDateTime(row.time)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
        <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground">{t("riskdash.drill.note")}</span>
          <Button variant="outline" size="sm" onClick={onClose}>{t("common.close")}</Button>
        </div>
      </div>
    </div>
  );
}
