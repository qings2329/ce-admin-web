import { useState } from "react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";

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
    <div className="page">
      <h1>{t('depositAddresses.title')}</h1>
      {error && <div className="alert-error">{error}</div>}

      <form
        className="inline-form"
        onSubmit={(e) => {
          e.preventDefault();
          reload();
        }}
      >
        <input
          placeholder={t('depositAddresses.userIdPh')}
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <input
          placeholder={t('depositAddresses.chainPh')}
          value={chain}
          onChange={(e) => setChain(e.target.value.toUpperCase())}
        />
        <button className="btn" type="submit">
          {t('common.query')}
        </button>
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
          { key: "user_id", label: t('col.userId') },
          { key: "chain", label: t('col.chain') },
          {
            key: "address",
            label: t('col.address'),
            render: (row: any) => (
              <span className="addr-cell" title={row.address}>
                {row.address}
              </span>
            ),
          },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <button className="btn" onClick={() => copy(row.address)}>
                {copied === row.address ? t('depositAddresses.copied') : t('depositAddresses.copy')}
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
