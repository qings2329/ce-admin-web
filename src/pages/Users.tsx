import { useState } from "react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";

export function Users() {
  const { t } = useI18n();
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) => api.listUsers(p));
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [balance, setBalance] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const toggle = async (id: number, freeze: boolean) => {
    try {
      if (freeze) await api.freezeUser(id);
      else await api.unfreezeUser(id);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    }
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    try {
      await api.createUser({
        username,
        email,
        password,
        balance: parseFloat(balance || "0"),
        status: "active",
        kyc: "none",
      });
      setUsername("");
      setEmail("");
      setPassword("");
      setBalance("");
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    }
  };

  return (
    <div className="page">
      <h1>{t('users.title')}</h1>
      {error && <div className="alert-error">{error}</div>}
      {msg && <div className="alert-info">{msg}</div>}

      <form className="inline-form" onSubmit={create}>
        <input placeholder={t('users.usernamePh')} value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder={t('users.emailPh')} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          placeholder={t('users.initPwdPh')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />
        <input
          placeholder={t('users.balancePh')}
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          type="number"
        />
        <button className="btn" type="submit">
          {t('users.create')}
        </button>
      </form>

      <ApiTable
        title={t('users.listTitle')}
        rows={items}
        loading={loading}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: "ID" },
          { key: "username", label: t('col.username') },
          { key: "email", label: t('col.email') },
          { key: "status", label: t('col.status') },
          { key: "kyc", label: "KYC" },
          { key: "balance", label: t('col.balance') },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <button
                className="btn"
                onClick={() => toggle(row.id, row.status === "active")}
              >
                {row.status === "active" ? t('users.freeze') : t('users.unfreeze')}
              </button>
            ),
          },
        ]}
      />
    </div>
  );
}
