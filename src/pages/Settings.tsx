import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";
import { useI18n, LOCALES } from "../i18n";
import { applyTheme, THEMES, THEME_STORAGE_KEY, type ThemeId } from "../lib/theme";
import { getTimeZone, setTimeZone, COMMON_TZ } from "../lib/timezone";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Select } from "../components/ui/select";
import { Card, CardContent } from "../components/ui/card";
import { Alert } from "../components/ui/alert";
import { StatusBadge } from "../components/ui/status-badge";
import { DestructiveActionGuard } from "../components/ui/DestructiveActionGuard";
import { CopyButton } from "../components/ui/CopyButton";
import { PasswordField } from "../components/ui/PasswordField";
import { AlertTriangle, Loader2 } from "lucide-react";

export function Settings() {
  const { t, locale, setLocale } = useI18n();
  const [me, setMe] = useState<any>(null);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [mfaMsg, setMfaMsg] = useState<string | null>(null);
  const [mfaBusy, setMfaBusy] = useState(false);

  const [prefTheme, setPrefTheme] = useState<ThemeId>(
    () => (localStorage.getItem(THEME_STORAGE_KEY) as ThemeId) || "dark",
  );
  const [prefTz, setPrefTz] = useState<string>(() => getTimeZone());
  const [prefMsg, setPrefMsg] = useState<string | null>(null);
  const [prefBusy, setPrefBusy] = useState(false);

  const touchedRef = useRef<{ lang?: boolean; theme?: boolean; tz?: boolean }>({});

  const loadMe = async () => {
    try {
      setMe(await api.me());
    } catch {
      /* 忽略 */
    }
  };
  const loadPrefs = async () => {
    try {
      const p = await api.getPreferences();
      if (p?.language && !touchedRef.current.lang) setLocale(p.language as typeof locale);
      if (p?.theme && !touchedRef.current.theme) {
        setPrefTheme(p.theme as ThemeId);
        applyTheme(p.theme as ThemeId);
      }
      if (p && "timezone" in p && !touchedRef.current.tz) {
        setPrefTz(p.timezone || "");
        setTimeZone(p.timezone || "");
      }
    } catch {
      /* 后端不可用时保留 localStorage（初始 state 已读取） */
    }
  };
  useEffect(() => {
    loadMe();
    loadPrefs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!oldPw || !newPw) {
      setPwMsg(t("settings.pwFillAll"));
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg(t("settings.pwMismatch"));
      return;
    }
    if (newPw.length < 6) {
      setPwMsg(t("settings.pwMinLen"));
      return;
    }
    setPwBusy(true);
    try {
      await api.changePassword(oldPw, newPw);
      setPwMsg(t("settings.pwChanged"));
      setOldPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (e: any) {
      setPwMsg(e?.message ?? t("settings.pwChangeFailed"));
    } finally {
      setPwBusy(false);
    }
  };

  const startSetup = async () => {
    setMfaMsg(null);
    try {
      setSetup(await api.mfaSetup());
    } catch (e: any) {
      setMfaMsg(e?.message ?? t("settings.mfaInitFailed"));
    }
  };
  const enable = async () => {
    if (!setup) return;
    if (!code) {
      setMfaMsg(t("settings.codeRequired"));
      return;
    }
    setMfaBusy(true);
    setMfaMsg(null);
    try {
      await api.mfaEnable(code);
      setMfaMsg(t("settings.mfaEnabled"));
      setSetup(null);
      setCode("");
      loadMe();
    } catch (e: any) {
      setMfaMsg(e?.message ?? t("settings.mfaEnableFailed"));
    } finally {
      setMfaBusy(false);
    }
  };
  const disable = async () => {
    if (!code) {
      setMfaMsg(t("settings.codeRequired"));
      return;
    }
    setMfaBusy(true);
    setMfaMsg(null);
    try {
      await api.mfaDisable(code || undefined);
      setMfaMsg(t("settings.mfaDisabled"));
      setCode("");
      loadMe();
    } catch (e: any) {
      setMfaMsg(e?.message ?? t("settings.mfaDisableFailed"));
    } finally {
      setMfaBusy(false);
    }
  };

  const savePrefs = async () => {
    localStorage.setItem(THEME_STORAGE_KEY, prefTheme);
    applyTheme(prefTheme);
    setTimeZone(prefTz);
    setPrefBusy(true);
    setPrefMsg(null);
    try {
      await api.updatePreferences({ language: locale, theme: prefTheme, timezone: prefTz });
      setPrefMsg(t("settings.prefSaved"));
    } catch (e: any) {
      setPrefMsg(t("settings.prefFail", { err: e?.message ?? "" }));
    } finally {
      setPrefBusy(false);
    }
  };

  const onLang = (v: typeof locale) => {
    touchedRef.current.lang = true;
    setLocale(v);
  };
  const onTheme = (v: ThemeId) => {
    touchedRef.current.theme = true;
    setPrefTheme(v);
  };
  const onTz = (v: string) => {
    touchedRef.current.tz = true;
    setPrefTz(v);
  };

  return (
    <div className="space-y-5">
      <h1 className="mb-3 text-lg font-semibold">{t("settings.title")}</h1>
      {prefMsg && <Alert variant={prefMsg.includes("失败") ? "error" : "info"}>{prefMsg}</Alert>}
      {(pwMsg || mfaMsg) && <Alert variant={pwMsg?.includes("失败") || mfaMsg?.includes("失败") ? "error" : "info"}>{pwMsg || mfaMsg}</Alert>}

      {me && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Card className="flex flex-col gap-1.5 p-3">
            <span className="text-xs text-muted-foreground">{t("settings.currentAccount")}</span>
            <span className="text-base font-semibold">{me.username}</span>
          </Card>
          <Card className="flex flex-col gap-1.5 p-3">
            <span className="text-xs text-muted-foreground">{t("col.role")}</span>
            <span className="text-base font-semibold">{me.role_name}</span>
          </Card>
          <Card className="flex flex-col gap-1.5 p-3">
            <span className="text-xs text-muted-foreground">{t("settings.mfaStatus")}</span>
            <StatusBadge tone={me.totp_enabled ? "success" : "neutral"}>
              {me.totp_enabled ? t("common.enabled") : t("common.disabled")}
            </StatusBadge>
          </Card>
        </div>
      )}

      {/* 修改密码 */}
      <section>
        <h2 className="mb-3 mt-1 text-base font-semibold">{t("settings.changePwd")}</h2>
        <Card>
          <CardContent>
            <form className="space-y-3" onSubmit={changePw}>
              <PasswordField
                label={t("settings.oldPwd")}
                placeholder={t("settings.oldPwdPh")}
                value={oldPw}
                onChange={(e) => setOldPw(e.target.value)}
                disabled={pwBusy}
              />
              <PasswordField
                label={t("settings.newPwd")}
                placeholder={t("settings.newPwdPh")}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                disabled={pwBusy}
              />
              <PasswordField
                label={t("settings.confirmPwd")}
                placeholder={t("settings.confirmPwdPh")}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                disabled={pwBusy}
              />
              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" disabled={pwBusy} className="gap-1.5">
                  {pwBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t("settings.changePwd")}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* MFA */}
      <section>
        <h2 className="mb-3 mt-1 text-base font-semibold">{t("settings.mfa")}</h2>
        {me?.totp_enabled ? (
          <Card>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("settings.mfaEnabledNote")}</p>
              <DestructiveActionGuard
                confirmText={String(me.id)}
                confirmLabel={t("settings.disableMfa")}
                description={t("settings.mfaDisableDesc", { uid: me.id })}
                onConfirm={async () => {
                  await disable();
                }}
                trigger={
                  <Button variant="destructive" className="border-dashed gap-1.5" disabled={mfaBusy}>
                    {mfaBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {t("settings.disableMfa")}
                  </Button>
                }
              />
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  disable();
                }}
              >
                <Input
                  placeholder={t("settings.curCodePh")}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={mfaBusy}
                  className="max-w-[180px]"
                />
                <Button type="submit" variant="outline" size="sm" disabled={mfaBusy || !code}>
                  {t("settings.submitCode")}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : setup ? (
          <Card>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("settings.step1")}</p>
              <div className="flex items-start gap-2 rounded-md border border-border bg-background p-3">
                <code className="flex-1 text-xs font-mono whitespace-pre-wrap break-all">{setup.secret}</code>
                <CopyButton value={setup.secret} />
              </div>
              <p className="text-sm text-muted-foreground">{t("settings.step2otp")}</p>
              <div className="flex items-start gap-2 rounded-md border border-border bg-background p-3">
                <code className="flex-1 text-xs font-mono whitespace-pre-wrap break-all">{setup.otpauth_uri}</code>
                <CopyButton value={setup.otpauth_uri} />
              </div>
              <p className="text-sm text-muted-foreground">{t("settings.step2")}</p>
              <form
                className="flex flex-wrap items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  enable();
                }}
              >
                <Input
                  placeholder={t("settings.codePh")}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  disabled={mfaBusy}
                  className="max-w-[180px]"
                />
                <Button type="submit" disabled={mfaBusy || !code} className="gap-1.5">
                  {mfaBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {t("settings.enableMfa")}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{t("settings.notEnabled")}</p>
              <Button onClick={startSetup} disabled={mfaBusy} className="gap-1.5">
                {mfaBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {t("settings.bind")}
              </Button>
            </CardContent>
          </Card>
        )}
      </section>

      {/* 偏好设置 */}
      <section>
        <h2 className="mb-3 mt-1 text-base font-semibold">{t("settings.preferences")}</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Card className="flex flex-col gap-1.5 p-3">
            <span className="text-xs text-muted-foreground">{t("settings.language")}</span>
            <Select value={locale} onChange={(e) => onLang(e.target.value as typeof locale)}>
              {LOCALES.map((lc) => (
                <option key={lc.value} value={lc.value}>
                  {lc.label}
                </option>
              ))}
            </Select>
          </Card>
          <Card className="flex flex-col gap-1.5 p-3">
            <span className="text-xs text-muted-foreground">{t("settings.theme")}</span>
            <Select value={prefTheme} onChange={(e) => onTheme(e.target.value as ThemeId)}>
              {THEMES.map((th) => (
                <option key={th.value} value={th.value}>
                  {t(th.key)}
                </option>
              ))}
            </Select>
          </Card>
          <Card className="flex flex-col gap-1.5 p-3">
            <span className="text-xs text-muted-foreground">{t("settings.timezone")}</span>
            <Select value={prefTz} onChange={(e) => onTz(e.target.value)}>
              <option value="">{t("settings.tzAuto")}</option>
              {COMMON_TZ.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </Select>
          </Card>
        </div>
        <Button onClick={savePrefs} disabled={prefBusy} className="mt-3 gap-1.5">
          {prefBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {t("settings.savePrefs")}
        </Button>
      </section>
    </div>
  );
}
