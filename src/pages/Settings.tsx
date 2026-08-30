import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "../api/client";
import { useI18n, LOCALES } from "../i18n";
import { applyTheme, THEMES, THEME_STORAGE_KEY, type ThemeId } from "../lib/theme";
import { getTimeZone, setTimeZone, COMMON_TZ } from "../lib/timezone";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { StatusBadge } from "../components/ui/status-badge";
import { DestructiveActionGuard } from "../components/ui/DestructiveActionGuard";
import { CopyButton } from "../components/ui/CopyButton";
import { PasswordField } from "../components/ui/PasswordField";

import { Modal } from "../components/ui/Modal";
import { AlertTriangle, Loader2, Key, Shield, ShieldCheck, RefreshCw, Save, User } from "lucide-react";

export function Settings() {
  const { t, locale, setLocale } = useI18n();
  const [me, setMe] = useState<any>(null);
  const [showPwModal, setShowPwModal] = useState(false);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [mfaMsg, setMfaMsg] = useState<string | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);
  const [showMfaModal, setShowMfaModal] = useState(false);
  const [mfaStep, setMfaStep] = useState<"init" | "setup" | "enable">("init");
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [prefTheme, setPrefTheme] = useState<ThemeId>(
    () => (localStorage.getItem(THEME_STORAGE_KEY) as ThemeId) || "dark",
  );
  const [prefTz, setPrefTz] = useState<string>(() => getTimeZone());
  const [prefMsg, setPrefMsg] = useState<string | null>(null);
  const [prefBusy, setPrefBusy] = useState(false);

  const touchedRef = useRef<{ lang?: boolean; theme?: boolean; tz?: boolean }>({});

  const resetPwState = () => {
    setOldPw("");
    setNewPw("");
    setConfirmPw("");
    setPwMsg(null);
  };

  const openPwModal = () => {
    resetPwState();
    setShowPwModal(true);
  };

  const loadMe = async () => {
    try { setMe(await api.me()); } catch { /* ignore */ }
  };
  const loadPrefs = async () => {
    try {
      const p = await api.getPreferences();
      if (p?.language && !touchedRef.current.lang) setLocale(p.language as typeof locale);
      if (p?.theme && !touchedRef.current.theme) { setPrefTheme(p.theme as ThemeId); applyTheme(p.theme as ThemeId); }
      if (p && "timezone" in p && !touchedRef.current.tz) { setPrefTz(p.timezone || ""); setTimeZone(p.timezone || ""); }
    } catch { /* keep localStorage */ }
  };
  useEffect(() => { loadMe(); loadPrefs(); }, []); // eslint-disable-line

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!oldPw || !newPw) { setPwMsg(t("settings.pwFillAll")); return; }
    if (newPw !== confirmPw) { setPwMsg(t("settings.pwMismatch")); return; }
    if (newPw.length < 6) { setPwMsg(t("settings.pwMinLen")); return; }
    setPwBusy(true);
    try {
      await api.changePassword(oldPw, newPw);
      setPwMsg(t("settings.pwChanged"));
      setOldPw(""); setNewPw(""); setConfirmPw("");
      setShowPwModal(false);
    } catch (e: any) {
      setPwMsg(e?.message ?? t("settings.pwChangeFailed"));
    } finally { setPwBusy(false); }
  };

  const openMfaModal = async () => {
    setMfaMsg(null); setOtpDigits(["", "", "", "", "", ""]);
    setMfaStep("init"); setShowMfaModal(true);
  };
  const doInitSetup = async () => {
    setMfaBusy(true); setMfaMsg(null);
    try {
      const s = await api.mfaSetup();
      setSetup(s); setMfaStep("setup");
    } catch (e: any) {
      setMfaMsg(e?.message ?? t("settings.mfaInitFailed"));
    } finally { setMfaBusy(false); }
  };
  const closeMfaModal = () => {
    setShowMfaModal(false); setSetup(null);
    setOtpDigits(["", "", "", "", "", ""]);
    setMfaStep("init"); setMfaMsg(null);
  };
  const handleOtpDigitChange = (idx: number, val: string) => {
    const d = [...otpDigits];
    d[idx] = val.replace(/[^0-9]/g, "").slice(-1);
    setOtpDigits(d);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
  };
  const handleOtpKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
  };
  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!paste) return;
    const d = [...otpDigits];
    paste.split("").forEach((ch, i) => { d[i] = ch; });
    setOtpDigits(d);
    otpRefs.current[Math.min(paste.length, 5)]?.focus();
  };
  const doEnable = async () => {
    const entered = otpDigits.join("");
    if (!entered || entered.length !== 6) { setMfaMsg(t("settings.codeRequired")); return; }
    setMfaBusy(true); setMfaMsg(null);
    try {
      await api.mfaEnable(entered);
      setMfaMsg(t("settings.mfaEnabled"));
      setSetup(null); setOtpDigits(["", "", "", "", "", ""]);
      setMfaStep("enable"); loadMe();
    } catch (e: any) {
      setMfaMsg(e?.message ?? t("settings.mfaEnableFailed"));
    } finally { setMfaBusy(false); }
  };

  const disable = async () => {
    if (!otpDigits.join("")) { setMfaMsg(t("settings.codeRequired")); return; }
    setMfaBusy(true); setMfaMsg(null);
    try {
      await api.mfaDisable(otpDigits.join() || undefined);
      setMfaMsg(t("settings.mfaDisabled")); setOtpDigits(["", "", "", "", "", ""]);
      loadMe();
    } catch (e: any) {
      setMfaMsg(e?.message ?? t("settings.mfaDisableFailed"));
    } finally { setMfaBusy(false); }
  };

  const savePrefs = async () => {
    localStorage.setItem(THEME_STORAGE_KEY, prefTheme);
    applyTheme(prefTheme);
    setTimeZone(prefTz);
    setPrefBusy(true); setPrefMsg(null);
    try {
      await api.updatePreferences({ language: locale, theme: prefTheme, timezone: prefTz });
      setPrefMsg(t("settings.prefSaved"));
    } catch (e: any) {
      setPrefMsg(t("settings.prefFail", { err: e?.message ?? "" }));
    } finally { setPrefBusy(false); }
  };

  const onLang = (v: typeof locale) => { touchedRef.current.lang = true; setLocale(v); };
  const onTheme = (v: ThemeId) => { touchedRef.current.theme = true; setPrefTheme(v); };
  const onTz = (v: string) => { touchedRef.current.tz = true; setPrefTz(v); };

  const otpInputCls = "w-10 h-12 text-center text-lg font-mono font-semibold rounded-md border border-border bg-background focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 transition-all";

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">{t("settings.title")}</h1>
          <p className="text-xs text-muted-foreground">{t("settings.currentAccount")}</p>
        </div>
      </div>

      {prefMsg && <Alert variant={prefMsg.includes("失败") ? "error" : "info"}>{prefMsg}</Alert>}
      {(pwMsg || mfaMsg) && <Alert variant={(pwMsg || mfaMsg || "").includes("失败") ? "error" : "info"}>{pwMsg || mfaMsg}</Alert>}

      {/* Account Summary */}
      {me && (
        <Card>
          <CardContent className="pt-4 grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("settings.currentAccount")}</p>
              <p className="mt-1 text-sm font-semibold truncate">{me.username}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("col.role")}</p>
              <p className="mt-1 text-sm font-semibold">{me.role_name}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-muted-foreground">{t("settings.mfaStatus")}</p>
              <div className="mt-1 flex justify-center">
                <StatusBadge tone={me.totp_enabled ? "success" : "neutral"}>
                  {me.totp_enabled ? t("common.enabled") : t("common.disabled")}
                </StatusBadge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Change Password */}
      <section>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{t("settings.password")}</CardTitle>
              </div>
              <Button onClick={openPwModal} size="sm" className="ml-10 gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                {t("settings.changePwd")}
              </Button>
            </div>
            <span className="text-xs text-muted-foreground">{t("settings.newPwd")}</span>
          </CardHeader>
        </Card>
      </section>

      {/* 修改密码弹窗 */}
      <Modal open={showPwModal} title={t("settings.changePwd")} onClose={() => setShowPwModal(false)}
        footer={<>
          <Button variant="outline" onClick={() => setShowPwModal(false)} disabled={pwBusy}>{t("common.cancel")}</Button>
          <Button onClick={(e: any) => changePw(e)} disabled={pwBusy} className="gap-1.5">
            {pwBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {t("settings.changePwd")}
          </Button>
        </>}>
        <form className="space-y-3" onSubmit={changePw}>
          <PasswordField label={t("settings.oldPwd")} placeholder={t("settings.oldPwdPh")} value={oldPw} onChange={(e: any) => setOldPw(e.target.value)} disabled={pwBusy} />
          <PasswordField label={t("settings.newPwd")} placeholder={t("settings.newPwdPh")} value={newPw} onChange={(e: any) => setNewPw(e.target.value)} disabled={pwBusy} showStrength getStrengthText={(p) => p <= 2 ? t("settings.pwStrengthWeak") : p <= 3 ? t("settings.pwStrengthMedium") : t("settings.pwStrengthStrong")} />
          <PasswordField label={t("settings.confirmPwd")} placeholder={t("settings.confirmPwdPh")} value={confirmPw} onChange={(e: any) => setConfirmPw(e.target.value)} disabled={pwBusy} showStrength={false} />
        </form>
      </Modal>

      {/* MFA */}
      <section>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              {me?.totp_enabled
                ? <ShieldCheck className="h-4 w-4 text-success" />
                : <Shield className="h-4 w-4 text-muted-foreground" />
              }
              <CardTitle className="text-base">{t("settings.mfa")}</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">{me?.totp_enabled ? t("settings.mfaEnabledNote") : t("settings.notEnabled")}</span>
          </CardHeader>
          <CardContent className="space-y-3">
            {me?.totp_enabled ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{t("settings.curCode")}</span>
                  <Input
                    placeholder={t("settings.curCodePh")}
                    value={otpDigits.join("")}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(-6);
                      setOtpDigits([...v.padEnd(6, "").split(""), ...Array(6).fill("")].slice(0, 6));
                    }}
                    disabled={mfaBusy}
                    className="max-w-[180px] h-8 text-sm"
                  />
                  <Button variant="outline" size="sm" disabled={mfaBusy || otpDigits.join("").length !== 6} onClick={disable}>
                    {t("settings.submitCode")}
                  </Button>
                </div>
                <DestructiveActionGuard
                  confirmText={String(me.id)}
                  confirmLabel={t("settings.disableMfa")}
                  description={t("settings.mfaDisableDesc", { uid: me.id })}
                  onConfirm={async () => { if (otpDigits.join("").length === 6) await disable(); }}
                  trigger={
                    <Button variant="destructive" size="sm" className="border-dashed gap-1.5" disabled={mfaBusy}>
                      {mfaBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {t("settings.disableMfa")}
                    </Button>
                  }
                />
              </>
            ) : (
              <Button onClick={openMfaModal} disabled={mfaBusy} className="gap-1.5">
                {mfaBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <Shield className="h-4 w-4" />
                {t("settings.bind")}
              </Button>
            )}
          </CardContent>
        </Card>
      </section>

      {/* MFA Modal */}
      <Modal open={showMfaModal} title={t("settings.mfa")} onClose={closeMfaModal} size="md"
        footer={
          mfaStep === "setup" ? <>
            <Button variant="outline" onClick={closeMfaModal} disabled={mfaBusy}>{t("common.cancel")}</Button>
            <Button onClick={doEnable} disabled={mfaBusy || otpDigits.join("").length !== 6} className="gap-1.5">
              {mfaBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("settings.enableMfa")}
            </Button>
          </> : mfaStep === "enable" ? (
            <Button onClick={closeMfaModal} className="gap-1.5">
              <ShieldCheck className="h-4 w-4" />
              {t("common.close")}
            </Button>
          ) : (
            <Button onClick={doInitSetup} disabled={mfaBusy} className="gap-1.5">
              {mfaBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {t("settings.bind")}
            </Button>
          )
        }
      >
        {mfaMsg && <Alert variant={mfaMsg.includes("失败") ? "error" : "info"}>{mfaMsg}</Alert>}

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {[
            { step: 1, label: t("settings.step1").match(/^\d+/)?.[0] || "1" },
            { step: 2, label: t("settings.step2").match(/^\d+/)?.[0] || "2" },
          ].map(({ step, label }, i) => (
            <div key={step} className="flex items-center gap-2 flex-1">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                (mfaStep === "init" && step === 1) || (mfaStep === "setup" && step <= 1) || (mfaStep === "enable" && step <= 2)
                  ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{label}</div>
              <div className={`h-px flex-1 ${i < 1 ? "bg-border" : ""}`} />
            </div>
          ))}
        </div>

        {mfaStep === "init" && (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
            <Shield className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("settings.notEnabled")}</p>
            <p className="mt-2 text-xs text-muted-foreground">{t("settings.step1").replace(/^\d+\.\s*/, "")}</p>
          </div>
        )}

        {mfaStep === "setup" && setup && (
          <div className="space-y-5">
            {/* QR Code Section */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3">{t("settings.step1").replace(/^\d+\.\s*/, "")}</p>
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-xl border-2 border-border bg-white p-3 shadow-sm">
                  <QRCodeSVG value={setup.otpauth_uri} size={160} level="M" />
                </div>
                <p className="text-[11px] text-muted-foreground">{t("settings.scanQrHint")}</p>
              </div>
            </div>

            {/* Secret Key */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("settings.secret") ?? "Secret Key"}</p>
              <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                <code className="flex-1 text-sm font-mono tracking-wider">{setup.secret}</code>
                <CopyButton value={setup.secret} />
              </div>
            </div>

            {/* OTP Input */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">{t("settings.step2").replace(/^\d+\.\s*/, "")}</p>
              <div className="flex justify-center gap-2" onPaste={handleOtpPaste}>
                {otpDigits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={(e) => handleOtpDigitChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={mfaBusy}
                    className={otpInputCls}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {mfaStep === "enable" && (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
              <ShieldCheck className="h-6 w-6 text-success" />
            </div>
            <p className="text-sm font-medium text-success">{t("settings.mfaEnabled")}</p>
          </div>
        )}
      </Modal>

      {/* Preferences */}
      <section>
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">{t("settings.preferences")}</CardTitle>
            </div>
            <span className="text-xs text-muted-foreground">{t("settings.savePrefs")}</span>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("settings.language")}</label>
                <Select value={locale} onChange={(e) => onLang(e.target.value as typeof locale)}>
                  {LOCALES.map((lc) => <option key={lc.value} value={lc.value}>{lc.label}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("settings.theme")}</label>
                <Select value={prefTheme} onChange={(e) => onTheme(e.target.value as ThemeId)}>
                  {THEMES.map((th) => <option key={th.value} value={th.value}>{t(th.key)}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">{t("settings.timezone")}</label>
                <Select value={prefTz} onChange={(e) => onTz(e.target.value)}>
                  <option value="">{t("settings.tzAuto")}</option>
                  {COMMON_TZ.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                </Select>
              </div>
            </div>
            <Button onClick={savePrefs} disabled={prefBusy} className="mt-4 gap-1.5 w-full sm:w-auto">
              {prefBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <Save className="h-3.5 w-3.5" />
              {t("settings.savePrefs")}
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
