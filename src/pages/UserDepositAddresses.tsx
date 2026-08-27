import { useState } from "react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";

export function UserDepositAddresses() {
  const { t } = useI18n();
  const [userId, setUserId] = useState("");
  const [chain, setChain] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) =>
      api.listUserDepositAddresses({
        ...p,
        user_id: userId || undefined,
        chain: chain || undefined,
      }),
    );

  const copy = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(addr);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* 剪贴板不可用时静默忽略 */
    }
  };

  return (
    <div className="space-y-3">
      <h1 className="mb-3 text-lg font-semibold text-foreground">{t('depositAddresses.title')}</h1>
      {error && <Alert variant="error">{error}</Alert>}

      <form
        className="mb-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          reload();
        }}
      >
        <Input
          placeholder={t('depositAddresses.userIdPh')}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <Input
          placeholder={t('depositAddresses.chainPh')}
          value={chain}
          onChange={(e) => setChain(e.target.value.toUpperCase())}
        />
        <Button type="submit">
          {t('common.query')}
        </Button>
      </form>

      <ApiTable
        title={t('depositAddresses.listTitle')}
        rows={items}
        loading={loading}
        error={error}
        onReload={reload}
        actions={
          <Pager
            total={total}
            limit={limit}
            page={page}
            onChange={changePage}
            onLimitChange={changeLimit}
          />
        }
        columns={[
          { key: "user_id", label: t('col.userId'), render: (row: any) => <span className="num">{row.user_id}</span> },
          { key: "chain", label: t('col.chain') },
          {
            key: "address",
            label: t('col.address'),
            render: (row: any) => (
              <span className="num" title={row.address}>
                {row.address}
              </span>
            ),
          },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <Button size="sm" variant="outline" onClick={() => copy(row.address)}>
                {copied === row.address ? t('depositAddresses.copied') : t('depositAddresses.copy')}
              </Button>
            ),
          },
        ]}
      />
    </div>
  );
}
