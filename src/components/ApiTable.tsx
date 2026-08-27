import { type ReactNode } from "react";
import { useI18n } from "../i18n";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { Alert } from "./ui/alert";
import { Button } from "./ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./ui/table";

interface Column {
  key: string;
  label?: string;
  render?: (row: any) => ReactNode;
  mono?: boolean; // 该列数值/标识符使用等宽字体对齐
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
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          {actions}
          {onReload && (
            <Button variant="outline" size="sm" onClick={onReload}>
              {t('common.refresh')}
            </Button>
          )}
        </div>
      </CardHeader>
      {error && <Alert variant="error">{error}</Alert>}
      {loading && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {t('common.loading')}
        </div>
      )}
      {!loading && !error && rows.length === 0 && (
        <div className="px-3 py-2 text-xs text-muted-foreground">
          {resolvedEmptyText}
        </div>
      )}
      {!loading && !error && rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              {cols.map((c) => (
                <TableHead key={c.key}>{c.label ?? c.key}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={row.id ?? row.symbol ?? row.name ?? i}>
                {cols.map((c) => (
                  <TableCell key={c.key}>
                    {c.mono ? (
                      <span className="num">
                        {c.render ? c.render(row) : formatVal(row[c.key])}
                      </span>
                    ) : c.render ? (
                      c.render(row)
                    ) : (
                      formatVal(row[c.key])
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Card>
  );
}

function formatVal(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}
