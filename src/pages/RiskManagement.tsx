import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ApiTable } from "../components/ApiTable";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Card, CardContent } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { DestructiveActionGuard } from "../components/ui/DestructiveActionGuard";
import {
  PermPage,
  PermissionGuard,
  PermissionButton,
} from "../lib/permissions";

type Tab = "rules" | "blacklist" | "check";

const RULE_KINDS = ["withdraw_limit", "order_limit", "position_limit", "freq_limit"];
const RULE_SCOPES = ["global", "user"];
const BL_KINDS = ["user", "address"];

export function RiskManagement() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("rules");

  // ---- 规则 ----
  const [rules, setRules] = useState<any[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [rule, setRule] = useState({
    name: "",
    kind: "withdraw_limit",
    scope: "global",
    user_id: "",
    asset: "USDT",
    max_amount_per_day: "",
    max_count_per_day: "",
    min_kyc_level: "1",
    enabled: true,
  });

  // ---- 黑名单 ----
  const [bl, setBl] = useState<any[]>([]);
  const [blLoading, setBlLoading] = useState(false);
  const [blError, setBlError] = useState<string | null>(null);
  const [blForm, setBlForm] = useState({ target: "", kind: "address", reason: "" });

  // ---- 预检 ----
  const [checkTarget, setCheckTarget] = useState("");
  const [checkRes, setCheckRes] = useState<{ blacklisted: boolean } | null>(null);
  const [wd, setWd] = useState({ user_id: "1", asset: "USDT", amount: "10", kyc_level: "1", address: "" });
  const [wdRes, setWdRes] = useState<{ allowed: boolean; reason?: string } | null>(null);

  // ---- 反馈 ----
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadRules = async () => {
    setRulesLoading(true);
    setRulesError(null);
    setMsg(null);
    try {
      const d = await api.getRiskRules();
      setRules(d?.items ?? []);
    } catch (e: any) {
      setRulesError(e?.message ?? t("common.queryFailed"));
    } finally {
      setRulesLoading(false);
    }
  };

  const loadBl = async () => {
    setBlLoading(true);
    setBlError(null);
    setMsg(null);
    try {
      const d = await api.getRiskBlacklist();
      setBl(d?.items ?? []);
    } catch (e: any) {
      setBlError(e?.message ?? t("common.queryFailed"));
    } finally {
      setBlLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "rules") loadRules();
    else if (tab === "blacklist") loadBl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

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

  const kindLabel = (k: string) =>
    ({ withdraw_limit: t("riskManage.kWithdrawLimit"), order_limit: t("riskManage.kOrderLimit"), position_limit: t("riskManage.kPositionLimit"), freq_limit: t("riskManage.kFreqLimit") } as Record<string, string>)[k] ?? k;
  const scopeLabel = (s: string) =>
    ({ global: t("riskManage.sGlobal"), user: t("riskManage.sUser") } as Record<string, string>)[s] ?? s;
  const blKindLabel = (k: string) =>
    ({ user: t("riskManage.blUser"), address: t("riskManage.blAddress") } as Record<string, string>)[k] ?? k;

  const addRule = async () => {
    if (!rule.name.trim()) {
      setMsg({ kind: "err", text: t("riskManage.nameRequired") });
      return;
    }
    try {
      await doManaged(
        () =>
          api.createRiskRule({
            name: rule.name.trim(),
            kind: rule.kind,
            scope: rule.scope,
            user_id: rule.scope === "user" && rule.user_id ? Number(rule.user_id) : undefined,
            asset: rule.asset || undefined,
            max_amount_per_day: rule.max_amount_per_day ? Number(rule.max_amount_per_day) : undefined,
            max_count_per_day: rule.max_count_per_day ? Number(rule.max_count_per_day) : undefined,
            min_kyc_level: Number(rule.min_kyc_level),
            enabled: rule.enabled,
          }),
        t("riskManage.addRuleDone"),
      );
      setRule({ name: "", kind: "withdraw_limit", scope: "global", user_id: "", asset: "USDT", max_amount_per_day: "", max_count_per_day: "", min_kyc_level: "1", enabled: true });
      loadRules();
    } catch {
      /* 错误已展示 */
    }
  };

  const addBl = async () => {
    if (!blForm.target.trim()) {
      setMsg({ kind: "err", text: t("riskManage.targetRequired") });
      return;
    }
    try {
      await doManaged(
        () => api.createRiskBlacklist({ target: blForm.target.trim(), kind: blForm.kind, reason: blForm.reason }),
        t("riskManage.addBlacklistDone"),
      );
      setBlForm({ target: "", kind: "address", reason: "" });
      loadBl();
    } catch {
      /* 错误已展示 */
    }
  };

  const removeBl = async (target: string) => {
    try {
      await doManaged(() => api.deleteRiskBlacklist(target), t("riskManage.removeDone"));
      loadBl();
    } catch {
      /* 错误已展示 */
    }
  };

  const doCheck = async () => {
    if (!checkTarget.trim()) return;
    setCheckRes(null);
    setMsg(null);
    try {
      const r = await api.checkRiskBlacklist(checkTarget.trim());
      setCheckRes({ blacklisted: !!r?.blacklisted });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? t("common.queryFailed") });
    }
  };

  const doWdCheck = async () => {
    setWdRes(null);
    setMsg(null);
    try {
      const r = await api.checkRiskWithdraw({
        user_id: Number(wd.user_id),
        asset: wd.asset,
        amount: Number(wd.amount),
        kyc_level: Number(wd.kyc_level),
        address: wd.address,
      });
      setWdRes({ allowed: !!r?.allowed, reason: r?.reason });
    } catch (e: any) {
      setMsg({ kind: "err", text: e?.message ?? t("common.queryFailed") });
    }
  };

  return (
    <PermPage need="risk:view" title={t("riskManage.title")} permHint={t("riskManage.noViewPerm")}>
      <div className="space-y-4">
        <h1 className="mb-3 text-lg font-semibold">{t("riskManage.title")}</h1>

        <div className="mb-3 flex gap-1.5">
          {(["rules", "blacklist", "check"] as Tab[]).map((key) => (
            <Button
              key={key}
              size="sm"
              variant={tab === key ? "default" : "outline"}
              onClick={() => { setTab(key); setMsg(null); }}
            >
              {t(`riskManage.tab.${key}`)}
            </Button>
          ))}
        </div>

        {msg && (
          <Alert variant={msg.kind === "ok" ? "info" : "error"}>
            <pre className="whitespace-pre-wrap break-all text-xs">{msg.text}</pre>
          </Alert>
        )}

        {/* ===== 规则 ===== */}
        {tab === "rules" && (
          <>
            {rulesError && <Alert variant="error">{rulesError}</Alert>}
            <PermissionGuard
              need="risk:manage"
              fallback={<Alert variant="error">{t("riskManage.noManagePerm")}</Alert>}
            >
              <Card className="mb-3">
                <CardContent className="space-y-3">
                  <h2 className="font-semibold">{t("riskManage.addRule")}</h2>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("riskManage.name")}
                      <Input className="w-[160px]" value={rule.name} onChange={(e) => setRule({ ...rule, name: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("riskManage.kind")}
                      <Select className="w-[150px]" value={rule.kind} onChange={(e) => setRule({ ...rule, kind: e.target.value })}>
                        {RULE_KINDS.map((k) => (
                          <option key={k} value={k}>{kindLabel(k)}</option>
                        ))}
                      </Select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("riskManage.scope")}
                      <Select className="w-[120px]" value={rule.scope} onChange={(e) => setRule({ ...rule, scope: e.target.value })}>
                        {RULE_SCOPES.map((s) => (
                          <option key={s} value={s}>{scopeLabel(s)}</option>
                        ))}
                      </Select>
                    </label>
                    {rule.scope === "user" && (
                      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                        {t("col.userId")}
                        <Input className="w-[120px]" type="number" value={rule.user_id} onChange={(e) => setRule({ ...rule, user_id: e.target.value })} />
                      </label>
                    )}
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("col.coin")}
                      <Input className="w-[100px]" value={rule.asset} onChange={(e) => setRule({ ...rule, asset: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("riskManage.maxAmountPerDay")}
                      <Input className="w-[140px]" type="number" value={rule.max_amount_per_day} onChange={(e) => setRule({ ...rule, max_amount_per_day: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("riskManage.maxCountPerDay")}
                      <Input className="w-[120px]" type="number" value={rule.max_count_per_day} onChange={(e) => setRule({ ...rule, max_count_per_day: e.target.value })} />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("riskManage.minKyc")}
                      <Input className="w-[100px]" type="number" value={rule.min_kyc_level} onChange={(e) => setRule({ ...rule, min_kyc_level: e.target.value })} />
                    </label>
                    <label className="flex items-center gap-1.5 text-sm">
                      <input type="checkbox" checked={rule.enabled} onChange={(e) => setRule({ ...rule, enabled: e.target.checked })} />
                      {t("riskManage.enabled")}
                    </label>
                    <PermissionButton
                      need="risk:manage"
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors bg-primary px-2.5 py-1.5 text-primary-foreground hover:bg-primary/90"
                      disabled={busy}
                      onClick={addRule}
                    >
                      {t("riskManage.addRule")}
                    </PermissionButton>
                  </div>
                </CardContent>
              </Card>
            </PermissionGuard>
            <ApiTable
              title={t("riskManage.rulesTitle")}
              rows={rules}
              loading={rulesLoading}
              error={rulesError}
              onReload={loadRules}
              emptyText={t("riskManage.noRules")}
              columns={[
                { key: "id", label: t("col.id"), render: (r: any) => <span className="num">{r.id}</span> },
                { key: "name", label: t("col.name") },
                { key: "kind", label: t("riskManage.kind"), render: (r: any) => kindLabel(r.kind) },
                { key: "scope", label: t("riskManage.scope"), render: (r: any) => scopeLabel(r.scope) },
                { key: "user_id", label: t("col.userId"), render: (r: any) => <span className="num">{r.scope === "user" ? r.user_id : "-"}</span> },
                { key: "asset", label: t("col.coin") },
                { key: "max_amount_per_day", label: t("riskManage.maxAmountPerDay"), render: (r: any) => <span className="num">{r.max_amount_per_day ?? "-"}</span> },
                { key: "max_count_per_day", label: t("riskManage.maxCountPerDay"), render: (r: any) => <span className="num">{r.max_count_per_day ?? "-"}</span> },
                { key: "min_kyc_level", label: t("riskManage.minKyc"), render: (r: any) => <span className="num">{r.min_kyc_level ?? "-"}</span> },
                {
                  key: "enabled",
                  label: t("riskManage.enabled"),
                  render: (r: any) => (r.enabled === false ? <span className="text-muted-foreground">{t("common.off")}</span> : <span className="text-success">{t("common.on")}</span>),
                },
                { key: "created_at", label: t("col.createdAt"), render: (r: any) => <span className="num">{r.created_at}</span> },
              ]}
            />
          </>
        )}

        {/* ===== 黑名单 ===== */}
        {tab === "blacklist" && (
          <>
            {blError && <Alert variant="error">{blError}</Alert>}
            <PermissionGuard
              need="risk:manage"
              fallback={<Alert variant="error">{t("riskManage.noManagePerm")}</Alert>}
            >
              <Card className="mb-3">
                <CardContent className="space-y-3">
                  <h2 className="font-semibold">{t("riskManage.addToBlacklist")}</h2>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("riskManage.target")}
                      <Input className="w-[200px]" value={blForm.target} onChange={(e) => setBlForm({ ...blForm, target: e.target.value })} placeholder="user_id / 0x… / T…" />
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("riskManage.kind")}
                      <Select className="w-[120px]" value={blForm.kind} onChange={(e) => setBlForm({ ...blForm, kind: e.target.value })}>
                        {BL_KINDS.map((k) => (
                          <option key={k} value={k}>{blKindLabel(k)}</option>
                        ))}
                      </Select>
                    </label>
                    <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {t("riskManage.reason")}
                      <Input className="w-[200px]" value={blForm.reason} onChange={(e) => setBlForm({ ...blForm, reason: e.target.value })} />
                    </label>
                    <PermissionButton
                      need="risk:manage"
                      className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs font-medium transition-colors bg-primary px-2.5 py-1.5 text-primary-foreground hover:bg-primary/90"
                      disabled={busy}
                      onClick={addBl}
                    >
                      {t("riskManage.addToBlacklist")}
                    </PermissionButton>
                  </div>
                </CardContent>
              </Card>
            </PermissionGuard>
            <ApiTable
              title={t("riskManage.blacklistTitle")}
              rows={bl}
              loading={blLoading}
              error={blError}
              onReload={loadBl}
              emptyText={t("riskManage.noBlacklist")}
              columns={[
                { key: "id", label: t("col.id"), render: (r: any) => <span className="num">{r.id}</span> },
                { key: "target", label: t("riskManage.target") },
                { key: "kind", label: t("riskManage.kind"), render: (r: any) => blKindLabel(r.kind) },
                { key: "reason", label: t("riskManage.reason") },
                { key: "created_at", label: t("col.createdAt"), render: (r: any) => <span className="num">{r.created_at}</span> },
                {
                  key: "actions",
                  label: t("col.actions"),
                  render: (r: any) => (
                    <DestructiveActionGuard
                      trigger={
                        <Button variant="outline" size="sm">
                          {t("riskManage.removeBlacklist")}
                        </Button>
                      }
                      busy={busy}
                      confirmText={String(r.target)}
                      title={t("riskManage.removeConfirmTitle")}
                      description={t("riskManage.removeConfirmDesc", { target: r.target })}
                      onConfirm={() => removeBl(String(r.target))}
                    />
                  ),
                },
              ]}
            />
          </>
        )}

        {/* ===== 预检（只读） ===== */}
        {tab === "check" && (
          <>
            <Card className="mb-3">
              <CardContent className="space-y-3">
                <h2 className="font-semibold">{t("riskManage.checkBlacklistTitle")}</h2>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t("riskManage.target")}
                    <Input className="w-[240px]" value={checkTarget} onChange={(e) => setCheckTarget(e.target.value)} placeholder="user_id / 0x… / T…" />
                  </label>
                  <Button size="sm" onClick={doCheck}>{t("riskManage.checkBlacklistBtn")}</Button>
                  {checkRes && (
                    <span className={checkRes.blacklisted ? "text-destructive font-medium" : "text-success font-medium"}>
                      {checkRes.blacklisted ? t("riskManage.blacklistedYes") : t("riskManage.blacklistedNo")}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="space-y-3">
                <h2 className="font-semibold">{t("riskManage.withdrawPrecheckTitle")}</h2>
                <div className="flex flex-wrap items-end gap-2">
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t("col.userId")}
                    <Input className="w-[110px]" type="number" value={wd.user_id} onChange={(e) => setWd({ ...wd, user_id: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t("col.coin")}
                    <Input className="w-[110px]" value={wd.asset} onChange={(e) => setWd({ ...wd, asset: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t("riskManage.amount")}
                    <Input className="w-[120px]" type="number" value={wd.amount} onChange={(e) => setWd({ ...wd, amount: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t("riskManage.kycLevel")}
                    <Input className="w-[100px]" type="number" value={wd.kyc_level} onChange={(e) => setWd({ ...wd, kyc_level: e.target.value })} />
                  </label>
                  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                    {t("col.address")}
                    <Input className="w-[240px]" value={wd.address} onChange={(e) => setWd({ ...wd, address: e.target.value })} placeholder="0x… / T…" />
                  </label>
                  <Button size="sm" onClick={doWdCheck}>{t("riskManage.precheckBtn")}</Button>
                  {wdRes && (
                    <span className={wdRes.allowed ? "text-success font-medium" : "text-destructive font-medium"}>
                      {wdRes.allowed ? t("riskManage.allowed") : t("riskManage.rejected")}
                      {wdRes.reason ? `（${wdRes.reason}）` : ""}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </PermPage>
  );
}
