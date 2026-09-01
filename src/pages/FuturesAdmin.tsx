import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ApiTable } from "../components/ApiTable";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { DestructiveActionGuard } from "../components/ui/DestructiveActionGuard";
import {
  PermPage,
  PermissionGuard,
  PermissionButton,
} from "../lib/permissions";

type Tab = "positions" | "funding" | "manage";

export function FuturesAdmin() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("positions");

  // ---- 持仓 ----
  const [posSymbol, setPosSymbol] = useState("BTCUSDT");
  const [posRows, setPosRows] = useState<any[]>([]);
  const [posMark, setPosMark] = useState<number | null>(null);
  const [posLoading, setPosLoading] = useState(false);
  const [posError, setPosError] = useState<string | null>(null);

  // ---- 资金费 ----
  const [fundSymbol, setFundSymbol] = useState("BTCUSDT");
  const [fundData, setFundData] = useState<any>(null);
  const [fundHistory, setFundHistory] = useState<any[]>([]);
  const [fundLoading, setFundLoading] = useState(false);
  const [fundError, setFundError] = useState<string | null>(null);

  // ---- 管理操作反馈 ----
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // ---- 手工入账 ----
  const [depUser, setDepUser] = useState("1");
  const [depAmount, setDepAmount] = useState("1000");

  // ---- 代客直提 ----
  const [wdUser, setWdUser] = useState("1");
  const [wdAsset, setWdAsset] = useState("USDT");
  const [wdChain, setWdChain] = useState("tron");
  const [wdAmount, setWdAmount] = useState("10");
  const [wdAddress, setWdAddress] = useState("");

  // ---- 风控开关 ----
  const [riskEnabled, setRiskEnabled] = useState(true);
  const [riskAutoFreeze, setRiskAutoFreeze] = useState(false);
  const [riskWindow, setRiskWindow] = useState("60");
  const [riskVelAmount, setRiskVelAmount] = useState("50000");
  const [riskVelCount, setRiskVelCount] = useState("20");
  const [riskAddrBurst, setRiskAddrBurst] = useState("5");

  // ---- 坏账分摊 ----
  const [socAsset, setSocAsset] = useState("USDT");
  const [socProposal, setSocProposal] = useState("");

  const loadPositions = async () => {
    setPosLoading(true);
    setPosError(null);
    setMsg(null);
    try {
      const d = await api.getFuturesPositions({ symbol: posSymbol });
      setPosRows(Array.isArray(d?.positions) ? d.positions : []);
      setPosMark(d?.mark_price ?? null);
    } catch (e: any) {
      setPosError(e?.message ?? t("common.queryFailed"));
    } finally {
      setPosLoading(false);
    }
  };

  const loadFunding = async () => {
    setFundLoading(true);
    setFundError(null);
    setMsg(null);
    try {
      const [f, h] = await Promise.all([
        api.getFuturesFunding({ symbol: fundSymbol }),
        api.getFuturesFundingHistory(),
      ]);
      setFundData(f ?? null);
      setFundHistory(Array.isArray(h?.funding) ? h.funding : []);
    } catch (e: any) {
      setFundError(e?.message ?? t("common.queryFailed"));
    } finally {
      setFundLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "positions") loadPositions();
    else if (tab === "funding") loadFunding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const sideLabel = (s: string) =>
    s === "long" || s === "buy" ? t("common.buy") : s === "short" || s === "sell" ? t("common.sell") : s;
  const modeLabel = (m: string) =>
    m === "cross" ? t("futures.modeCross") : m === "isolated" ? t("futures.modeIsolated") : m;

  const doManaged = async (fn: () => Promise<any>, okText: string): Promise<any> => {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fn();
      setMsg({ kind: "ok", text: okText + (r ? "：" + JSON.stringify(r) : "") });
      return r;
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? t("common.opFailed") });
      throw e;
    } finally {
      setBusy(false);
    }
  };

  return (
    <PermPage need="futures:view" title={t("futures.title")} permHint={t("futures.noViewPerm")}>
      <div className="space-y-4">
        <h1 className="mb-3 text-lg font-semibold">{t("futures.title")}</h1>

        <div className="mb-3 flex gap-1.5">
          {(["positions", "funding", "manage"] as Tab[]).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={tab === key ? "default" : "outline"}
              onClick={() => { setTab(key); setMsg(null); }}
              disabled={key === "manage"}
            >
              {t(`futures.tab.${key}`)}
              {key === "manage" && "（需 futures:manage）"}
            </Button>
          ))}
        </div>

        {msg && (
          <Alert variant={msg.kind === "ok" ? "info" : "error"}>
            <pre className="whitespace-pre-wrap break-all text-xs">{msg.text}</pre>
          </Alert>
        )}

        {/* ===== 持仓 ===== */}
        {tab === "positions" && (
          <>
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {t("futures.symbol")}
                <Input
                  className="w-[160px]"
                  value={posSymbol}
                  onChange={(e) => setPosSymbol(e.target.value)}
                  placeholder="BTCUSDT"
                />
              </label>
              <Button size="sm" onClick={loadPositions} disabled={posLoading}>
                {t("common.query")}
              </Button>
            </div>
            {posError && <Alert variant="error">{posError}</Alert>}
            {posMark != null && (
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{t("futures.markPrice")}</div>
                  <div className="num text-base font-semibold">{posMark}</div>
                </div>
              </div>
            )}
            <ApiTable
              title={t("futures.positionsTitle")}
              rows={posRows}
              loading={posLoading}
              error={posError}
              onReload={loadPositions}
              emptyText={t("futures.noPositions")}
              columns={[
                { key: "user_id", label: t("col.userId"), render: (r: any) => <span className="num">{r.user_id}</span> },
                { key: "symbol", label: t("col.symbolPair") },
                { key: "side", label: t("col.side"), render: (r: any) => sideLabel(r.side) },
                { key: "mode", label: t("futures.mode"), render: (r: any) => modeLabel(r.mode) },
                { key: "size", label: t("col.positionSize"), render: (r: any) => <span className="num">{r.size}</span> },
                { key: "entry_price", label: t("futures.entryPrice"), render: (r: any) => <span className="num">{r.entry_price}</span> },
                { key: "mark_price", label: t("futures.markPrice"), render: (r: any) => <span className="num">{r.mark_price}</span> },
                { key: "liq_price", label: t("col.liqPrice"), render: (r: any) => <span className="num">{r.liq_price}</span> },
                { key: "margin", label: t("futures.margin"), render: (r: any) => <span className="num">{r.margin}</span> },
                { key: "pnl", label: t("futures.pnl"), render: (r: any) => <span className="num">{r.pnl}</span> },
                { key: "tp", label: t("futures.tp"), render: (r: any) => <span className="num">{r.tp ?? "-"}</span> },
                { key: "sl", label: t("futures.sl"), render: (r: any) => <span className="num">{r.sl ?? "-"}</span> },
              ]}
            />
          </>
        )}

        {/* ===== 资金费 ===== */}
        {tab === "funding" && (
          <>
            <div className="mb-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                {t("futures.symbol")}
                <Input
                  className="w-[160px]"
                  value={fundSymbol}
                  onChange={(e) => setFundSymbol(e.target.value)}
                  placeholder="BTCUSDT"
                />
              </label>
              <Button size="sm" onClick={loadFunding} disabled={fundLoading}>
                {t("common.query")}
              </Button>
            </div>
            {fundError && <Alert variant="error">{fundError}</Alert>}
            {fundData && (
              <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{t("futures.indexPrice")}</div>
                  <div className="num text-base font-semibold">{fundData.index_price}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{t("futures.markPrice")}</div>
                  <div className="num text-base font-semibold">{fundData.mark_price}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{t("futures.fundingRate")}</div>
                  <div className="num text-base font-semibold">{fundData.funding_rate}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{t("futures.premiumEma")}</div>
                  <div className="num text-base font-semibold">{fundData.premium_ema}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{t("futures.lastSettleRate")}</div>
                  <div className="num text-base font-semibold">{fundData.last_settle_rate}</div>
                </div>
                <div className="rounded-lg border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground">{t("futures.fundingInterval")}</div>
                  <div className="num text-base font-semibold">{fundData.funding_interval}s</div>
                </div>
              </div>
            )}
            <ApiTable
              title={t("futures.fundingHistoryTitle")}
              rows={fundHistory}
              loading={fundLoading}
              error={fundError}
              onReload={loadFunding}
              emptyText={t("futures.noFundingHistory")}
              columns={[
                { key: "symbol", label: t("col.symbolPair") },
                { key: "rate", label: t("futures.fundingRate"), render: (r: any) => <span className="num">{r.rate ?? r.funding_rate}</span> },
                { key: "time", label: t("col.time"), render: (r: any) => <span className="num">{r.time ?? r.ts ?? r.settled_at ?? "-"}</span> },
              ]}
            />
          </>
        )}

        {/* ===== 管理操作（需 futures:manage） ===== */}
        {tab === "manage" && (
          <PermissionGuard
            need="futures:manage"
            fallback={<Alert variant="error">{t("futures.noManagePerm")}</Alert>}
          >
            <div className="space-y-4">
              {/* 手工入账 */}
              <Card>
                <CardContent className="space-y-3">
                  <h2 className="font-semibold">{t("futures.deposit")}</h2>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("col.userId")}
                      <Input className="w-[120px]" value={depUser} onChange={(e) => setDepUser(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("futures.amount")}
                      <Input className="w-[140px]" type="number" value={depAmount} onChange={(e) => setDepAmount(e.target.value)} />
                    </label>
                    <DestructiveActionGuard
                      trigger={
                        <Button variant="destructive" size="sm">
                          {t("futures.deposit")}
                        </Button>
                      }
                      busy={busy}
                      confirmText={`DEP ${depAmount} ${depUser}`}
                      title={t("futures.depositConfirmTitle")}
                      description={t("futures.depositConfirmDesc", { amount: depAmount, user: depUser })}
                      onConfirm={() =>
                        doManaged(
                          () => api.futuresDeposit({ user_id: Number(depUser), amount: Number(depAmount) }),
                          t("futures.depositDone"),
                        )
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 代客直提 */}
              <Card>
                <CardContent className="space-y-3">
                  <h2 className="font-semibold">{t("futures.withdrawChain")}</h2>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("col.userId")}
                      <Input className="w-[110px]" value={wdUser} onChange={(e) => setWdUser(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("col.coin")}
                      <Input className="w-[110px]" value={wdAsset} onChange={(e) => setWdAsset(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("col.chain")}
                      <Input className="w-[110px]" value={wdChain} onChange={(e) => setWdChain(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("futures.amount")}
                      <Input className="w-[120px]" type="number" value={wdAmount} onChange={(e) => setWdAmount(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("col.address")}
                      <Input className="w-[240px]" value={wdAddress} onChange={(e) => setWdAddress(e.target.value)} placeholder="0x… / T…" />
                    </label>
                    <DestructiveActionGuard
                      trigger={
                        <Button variant="destructive" size="sm">
                          {t("futures.withdrawChain")}
                        </Button>
                      }
                      busy={busy}
                      confirmText={`WD ${wdAmount} ${wdAsset}`}
                      title={t("futures.withdrawConfirmTitle")}
                      description={t("futures.withdrawConfirmDesc", { amount: wdAmount, asset: wdAsset, address: wdAddress })}
                      onConfirm={() =>
                        doManaged(
                          () =>
                            api.futuresWithdrawChain({
                              user_id: Number(wdUser),
                              asset: wdAsset,
                              chain: wdChain,
                              amount: Number(wdAmount),
                              address: wdAddress,
                            }),
                          t("futures.withdrawDone"),
                        )
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 应急冻结 / 解冻 */}
              <Card>
                <CardContent className="space-y-3">
                  <h2 className="font-semibold">{t("futures.emergency")}</h2>
                  <div className="flex flex-wrap gap-2">
                    <DestructiveActionGuard
                      trigger={
                        <Button variant="destructive" size="sm">
                          {t("futures.freeze")}
                        </Button>
                      }
                      busy={busy}
                      confirmText="FREEZE"
                      title={t("futures.freezeConfirmTitle")}
                      description={t("futures.freezeConfirmDesc")}
                      onConfirm={() => doManaged(() => api.futuresEmergencyFreeze(), t("futures.freezeDone"))}
                    />
                    <DestructiveActionGuard
                      trigger={
                        <Button variant="outline" size="sm">
                          {t("futures.resume")}
                        </Button>
                      }
                      busy={busy}
                      confirmText="RESUME"
                      title={t("futures.resumeConfirmTitle")}
                      description={t("futures.resumeConfirmDesc")}
                      onConfirm={() => doManaged(() => api.futuresEmergencyResume(), t("futures.resumeDone"))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* 风控开关 */}
              <Card>
                <CardContent className="space-y-3">
                  <h2 className="font-semibold">{t("futures.riskEnable")}</h2>
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={riskEnabled} onChange={(e) => setRiskEnabled(e.target.checked)} />
                      {t("common.on")}
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={riskAutoFreeze} onChange={(e) => setRiskAutoFreeze(e.target.checked)} />
                      {t("futures.autoFreeze")}
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("futures.windowSec")}
                      <Input className="w-[100px]" type="number" value={riskWindow} onChange={(e) => setRiskWindow(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("futures.velAmount")}
                      <Input className="w-[120px]" type="number" value={riskVelAmount} onChange={(e) => setRiskVelAmount(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("futures.velCount")}
                      <Input className="w-[100px]" type="number" value={riskVelCount} onChange={(e) => setRiskVelCount(e.target.value)} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("futures.addrBurst")}
                      <Input className="w-[100px]" type="number" value={riskAddrBurst} onChange={(e) => setRiskAddrBurst(e.target.value)} />
                    </label>
                    <PermissionButton
                      need="futures:manage"
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors bg-primary px-2.5 py-1.5 text-primary-foreground hover:bg-primary/90"
                      disabled={busy}
                      onClick={() =>
                        doManaged(
                          () =>
                            api.futuresRiskEnable({
                              enabled: riskEnabled,
                              auto_freeze: riskAutoFreeze,
                              window_sec: Number(riskWindow),
                              velocity_amount: Number(riskVelAmount),
                              velocity_count: Number(riskVelCount),
                              addr_burst: Number(riskAddrBurst),
                            }),
                          t("futures.riskEnableDone"),
                        )
                      }
                    >
                      {t("futures.applyRisk")}
                    </PermissionButton>
                  </div>
                </CardContent>
              </Card>

              {/* 坏账社会化分摊 */}
              <Card>
                <CardContent className="space-y-3">
                  <h2 className="font-semibold">{t("futures.socialize")}</h2>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("col.coin")}
                      <Input className="w-[120px]" value={socAsset} onChange={(e) => setSocAsset(e.target.value)} />
                    </label>
                    <PermissionButton
                      need="futures:manage"
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors bg-primary px-2.5 py-1.5 text-primary-foreground hover:bg-primary/90"
                      disabled={busy}
                      onClick={async () => {
                        try {
                          const r = await doManaged(
                            () => api.futuresSocializePropose({ asset: socAsset }),
                            t("futures.proposeDone"),
                          );
                          if (r?.proposal_id) setSocProposal(String(r.proposal_id));
                        } catch {
                          /* 错误已展示 */
                        }
                      }}
                    >
                      {t("futures.propose")}
                    </PermissionButton>
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("futures.proposalId")}
                      <Input
                        className="w-[200px]"
                        value={socProposal}
                        onChange={(e) => setSocProposal(e.target.value)}
                        placeholder={t("futures.proposalIdPh")}
                      />
                    </label>
                    <DestructiveActionGuard
                      trigger={
                        <Button variant="destructive" size="sm">
                          {t("futures.approve")}
                        </Button>
                      }
                      busy={busy}
                      confirmText="SOCIALIZE"
                      title={t("futures.approveConfirmTitle")}
                      description={t("futures.approveConfirmDesc", { asset: socAsset })}
                      onConfirm={() =>
                        doManaged(
                          () => api.futuresSocializeApprove({ asset: socAsset, proposal_id: socProposal }),
                          t("futures.approveDone"),
                        )
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </PermissionGuard>
        )}
      </div>
    </PermPage>
  );
}
