import { useEffect, useRef, useState } from "react";
import { Search, AlertTriangle, Loader2, Wallet } from "lucide-react";
import { api } from "../api/client";
import { usePaged } from "../lib/usePaged";
import { ApiTable } from "../components/ApiTable";
import { Pager } from "../components/Pager";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";
import { StatusBadge } from "../components/ui/status-badge";
import { DestructiveActionGuard } from "../components/ui/DestructiveActionGuard";
import { ReviewDrawer, type ReviewItem } from "../components/drawer/ReviewDrawer";
import { routeParam } from "../lib/routeQuery";
import { MaskedText, maskEmail } from "../lib/mask";
import { Modal } from "../components/ui/Modal";

function formatNum(v: any): string {
  const n = Number(v ?? 0);
  if (!isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 8 });
}

export function Users() {
  const { t } = useI18n();
  const [q, setQ] = useState<string>(() => routeParam("q"));
  const qRef = useRef(q);
  qRef.current = q;
  const { items, total, limit, page, loading, error, reload, changePage, changeLimit } =
    usePaged((p) => api.listUsers({ ...p, q: qRef.current || undefined }));
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [balance, setBalance] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [drawerItem, setDrawerItem] = useState<ReviewItem | null>(null);
  const [drawerIndex, setDrawerIndex] = useState(0);
  const [balUser, setBalUser] = useState<any | null>(null);
  const [balances, setBalances] = useState<any | null>(null);
  const [balLoading, setBalLoading] = useState(false);
  const [balError, setBalError] = useState<string | null>(null);

  const toggle = async (id: number, freeze: boolean) => {
    try {
      if (freeze) await api.freezeUser(id);
      else await api.unfreezeUser(id);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.opFailed'));
    }
  };

  const openCreate = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setBalance("");
    setMsg(null);
    setShowCreate(true);
  };

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!username.trim()) {
      setMsg(t('users.pleaseUsername'));
      return;
    }
    if (!email.trim()) {
      setMsg(t('users.pleaseEmail'));
      return;
    }
    if (!password.trim() || password.length < 6) {
      setMsg(t('users.pleasePassword'));
      return;
    }
    if (parseFloat(balance) < 0) {
      setMsg(t('users.invalidBalance'));
      return;
    }
    setCreating(true);
    try {
      await api.createUser({
        username,
        email,
        password,
        balance: parseFloat(balance || "0"),
        status: "active",
        kyc: "none",
      });
      setShowCreate(false);
      reload();
    } catch (e: any) {
      setMsg(e?.message ?? t('common.createFailed'));
    } finally {
      setCreating(false);
    }
  };

  const openDrawer = (idx: number) => {
    setDrawerItem(items[idx]);
    setDrawerIndex(idx);
  };

  const closeDrawer = () => setDrawerItem(null);

  const openBalances = async (row: any) => {
    setBalUser(row);
    setBalances(null);
    setBalError(null);
    setBalLoading(true);
    try {
      const data = await api.getUserBalances(Number(row.id));
      setBalances(data);
    } catch (e: any) {
      setBalError(e?.message ?? t('common.opFailed'));
    } finally {
      setBalLoading(false);
    }
  };

  const navigate = (idx: number) => {
    setDrawerItem(items[idx]);
    setDrawerIndex(idx);
  };

  // Command Palette 深度链接：#/users?q= 预填搜索
  useEffect(() => {
    const apply = (v: string) => {
      if (!v) return;
      qRef.current = v;
      setQ(v);
      reload();
    };
    const init = routeParam("q");
    if (init) apply(init);
    const on = () => {
      const v = routeParam("q");
      if (v) apply(v);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-3">
      <h1 className="mb-3 text-lg font-semibold text-foreground">{t('users.title')}</h1>
      {error && <Alert variant="error">{error}</Alert>}
      {msg && <Alert variant="info">{msg}</Alert>}
      {toast && <Alert variant="info" className="animate-pulse">{toast}</Alert>}

      <Button onClick={openCreate} className="mb-3">
        {t('users.create')}
      </Button>

      <Modal
        open={showCreate}
        title={t('users.create')}
        onClose={() => setShowCreate(false)}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={(e: any) => create(e)} disabled={creating} className="gap-1.5">
              {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t('users.create')}
            </Button>
          </>
        }
        size="md"
      >
        <form onSubmit={create} className="space-y-4">
          <Input placeholder={t('users.usernamePh')} value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input placeholder={t('users.emailPh')} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input
            placeholder={t('users.initPwdPh')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
          />
          <Input
            placeholder={t('users.balancePh')}
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            type="number"
          />
        </form>
      </Modal>

      <form
        className="mb-3 flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          qRef.current = q;
          reload();
        }}
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder={t("search.lookupGroup")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        <Button type="submit" variant="outline" size="sm">
          {t('common.query')}
        </Button>
        {q && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              qRef.current = "";
              setQ("");
              reload();
            }}
          >
            ✕
          </Button>
        )}
      </form>

      <ApiTable
        title={t('users.listTitle')}
        rows={items}
        loading={loading}
        onReload={reload}
        actions={<Pager total={total} limit={limit} page={page} onChange={changePage} onLimitChange={changeLimit} />}
        columns={[
          { key: "id", label: "ID", render: (row: any) => <span className="num">{row.id}</span> },
          { key: "username", label: t('col.username') },
          {
            key: "email",
            label: t('col.email'),
            render: (row: any) => <MaskedText value={row.email} mask={maskEmail} />,
          },
          {
            key: "status",
            label: t('col.status'),
            render: (row: any) => (
              <StatusBadge tone={row.status === "active" ? "success" : "neutral"}>
                {row.status}
              </StatusBadge>
            ),
          },
          {
            key: "kyc",
            label: "KYC",
            render: (row: any) => <StatusBadge tone="neutral">{row.kyc}</StatusBadge>,
          },
          { key: "balance", label: t('col.balance'), render: (row: any) => <span className="num"><MaskedText value={row.balance} mask="balance" /></span> },
          {
            key: "op",
            label: t('col.actions'),
            render: (row: any) => (
              <div className="flex items-center gap-1">
                {row.status === "active" ? (
                  <DestructiveActionGuard
                    confirmText={String(row.id)}
                    description={t("users.freezeGuardDesc", { uid: row.id })}
                    onConfirm={async () => {
                      await toggle(row.id, true);
                    }}
                    trigger={
                      <Button size="sm" variant="destructive" className="border-dashed">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {t('users.freeze')}
                      </Button>
                    }
                  />
                ) : (
                  <Button size="sm" variant="outline" onClick={() => toggle(row.id, false)}>
                    {t('users.unfreeze')}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => openDrawer(items.findIndex((r: any) => r.id === row.id))}>
                  {t('users.reviewKyc')}
                </Button>
                <Button size="sm" variant="outline" onClick={() => openBalances(row)}>
                  <Wallet className="h-3.5 w-3.5" />
                  {t('users.viewAccount')}
                </Button>
              </div>
            ),
          },
        ]}
      />

      {drawerItem && (
        <ReviewDrawer
          type="kyc"
          item={drawerItem}
          allItems={items as ReviewItem[]}
          currentIndex={drawerIndex}
          onClose={closeDrawer}
          onNavigate={navigate}
          onApprove={async () => { reload(); closeDrawer(); }}
          onReject={async () => { reload(); closeDrawer(); }}
          toast={(m) => { setToast(m); setTimeout(() => setToast(null), 2500); }}
        />
      )}

      <Modal
        open={!!balUser}
        title={`${t('users.accountBalances')} · ${balUser?.username ?? ''} (UID ${balUser?.id ?? ''})`}
        onClose={() => setBalUser(null)}
        size="lg"
      >
        {balLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.loading')}
          </div>
        )}
        {balError && <Alert variant="error">{balError}</Alert>}
        {!balLoading && !balError && balances && (
          <div className="space-y-4">
            {balances.assets && balances.assets.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">{t('col.coin')}</th>
                      <th className="pb-2 pr-4 text-right font-medium">{t('col.available')}</th>
                      <th className="pb-2 pr-4 text-right font-medium">{t('col.frozen')}</th>
                      <th className="pb-2 pr-4 text-right font-medium">{t('col.withdrawFrozen')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {balances.assets.map((a: any) => (
                      <tr key={a.asset} className="border-b border-muted last:border-0">
                        <td className="py-2 pr-4 font-medium">{a.asset}</td>
                        <td className="py-2 pr-4 text-right num"><MaskedText value={formatNum(a.available)} mask="balance" /></td>
                        <td className="py-2 pr-4 text-right num"><MaskedText value={formatNum(a.frozen)} mask="balance" /></td>
                        <td className="py-2 pr-4 text-right num"><MaskedText value={formatNum(a.withdraw_frozen)} mask="balance" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('users.noBalances')}</p>
            )}
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-4 py-2.5">
              <span className="text-sm font-medium">{t('users.totalAssets')}</span>
              <span className="num text-base font-semibold">
                <MaskedText value={formatNum(balances.total_assets)} mask="balance" />
              </span>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
