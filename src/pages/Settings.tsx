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

export function Settings() {
  const { t, locale, setLocale } = useI18n();
  const [me, setMe] = useState<any>(null);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [mfaMsg, setMfaMsg] = useState<string | null>(null);

  // 偏好（语言/主题/时区）持久化到 localStorage。
  const [prefTheme, setPrefTheme] = useState<ThemeId>(
    () => (localStorage.getItem(THEME_STORAGE_KEY) as ThemeId) || "dark",
  );
  const [prefTz, setPrefTz] = useState<string>(() => getTimeZone());
  const [prefMsg, setPrefMsg] = useState<string | null>(null);

  // 用户是否已手动改过某个偏好。loadPrefs 从后端拉取的是「初始值」，
  // 若用户已先一步编辑，则后到的异步响应不得覆盖用户的选择（避免竞态丢值）。
  // 用 ref 而非 state 持有：loadPrefs 在挂载期发起、异步返回，闭包需读到最新值。
  const touchedRef = useRef<{ lang?: boolean; theme?: boolean; tz?: boolean }>({});

  const loadMe = async () => {
    try {
      setMe(await api.me());
    } catch {
      /* 忽略 */
    }
  };
  // 启动时从后端拉取偏好并应用；后端不可用时回退到初始的 localStorage 值。
  // 注意：必须显式 applyTheme/setTimeZone，否则跨设备（无 localStorage）时仅更新 state、
  // 页面 <html data-theme> 仍是启动默认值，主题/时区同步会失效。
  // 仅当用户尚未手动修改该字段时才覆盖，防止异步响应覆盖用户已做的选择。
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
    // 仅挂载时拉取一次；touched 变化不应重新触发。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changePw = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    try {
      await api.changePassword(oldPw, newPw);
      setPwMsg(t("settings.pwChanged"));
      setOldPw("");
      setNewPw("");
    } catch (e: any) {
      setPwMsg(e?.message ?? t("settings.pwChangeFailed"));
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
    setMfaMsg(null);
    try {
      await api.mfaEnable(code);
      setMfaMsg(t("settings.mfaEnabled"));
      setSetup(null);
      setCode("");
      loadMe();
    } catch (e: any) {
      setMfaMsg(e?.message ?? t("settings.mfaEnableFailed"));
    }
  };
  const disable = async () => {
    setMfaMsg(null);
    try {
      await api.mfaDisable(code || undefined);
      setMfaMsg(t("settings.mfaDisabled"));
      setCode("");
      loadMe();
    } catch (e: any) {
      setMfaMsg(e?.message ?? t("settings.mfaDisableFailed"));
    }
  };

  const savePrefs = async () => {
    // 先立即应用并写入 localStorage（兜底缓存），保证本地体验不依赖后端。
    localStorage.setItem(THEME_STORAGE_KEY, prefTheme);
    applyTheme(prefTheme);
    setTimeZone(prefTz);
    try {
      await api.updatePreferences({ language: locale, theme: prefTheme, timezone: prefTz });
      setPrefMsg(t("settings.prefSaved"));
    } catch (e: any) {
      // 后端同步失败但本地已保存：提示失败详情，用户可稍后重试。
      setPrefMsg(t("settings.prefFail", { err: e?.message ?? "" }));
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
    <div className="space-y-4">
      <h1 className="mb-3 text-lg font-semibold">{t("settings.title")}</h1>
      {(pwMsg || mfaMsg) && <Alert variant="info">{pwMsg || mfaMsg}</Alert>}

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

      <h2 className="mb-3 mt-4 text-base font-semibold">{t("settings.changePwd")}</h2>
      <form className="mb-3 flex flex-wrap items-center gap-2" onSubmit={changePw}>
        <Input
          placeholder={t("settings.oldPwd")}
          type="password"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
        />
        <Input
          placeholder={t("settings.newPwd")}
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
        />
        <Button type="submit">
          {t("settings.changePwd")}
        </Button>
      </form>

      <h2 className="mb-3 mt-4 text-base font-semibold">{t("settings.mfa")}</h2>
      {me?.totp_enabled ? (
        <Card className="mb-3">
          <CardContent className="space-y-3">
            <p>{t("settings.mfaEnabledNote")}</p>
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
              />
              <Button type="submit">
                {t("settings.disableMfa")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : setup ? (
        <Card className="mb-3">
          <CardContent className="space-y-3">
            <p>{t("settings.step1")}</p>
            <pre className="rounded-md border border-border bg-background p-3 font-mono text-xs whitespace-pre-wrap break-all">
              {setup.secret}
            </pre>
            <p>{t("settings.step2otp")}</p>
            <pre className="rounded-md border border-border bg-background p-3 font-mono text-xs whitespace-pre-wrap break-all">
              {setup.otpauth_uri}
            </pre>
            <p>{t("settings.step2")}</p>
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
              />
              <Button type="submit">
                {t("settings.enableMfa")}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="mb-3">
          <CardContent className="space-y-3">
            <p>{t("settings.notEnabled")}</p>
            <Button onClick={startSetup}>
              {t("settings.bind")}
            </Button>
          </CardContent>
        </Card>
      )}

      <h2 className="mb-3 mt-4 text-base font-semibold">{t("settings.preferences")}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <Card className="flex flex-col gap-1.5 p-3">
          <span className="text-xs text-muted-foreground">{t("settings.language")}</span>
          <Select
            value={locale}
            onChange={(e) => onLang(e.target.value as typeof locale)}
          >
            {LOCALES.map((lc) => (
              <option key={lc.value} value={lc.value}>
                {lc.label}
              </option>
            ))}
          </Select>
        </Card>
        <Card className="flex flex-col gap-1.5 p-3">
          <span className="text-xs text-muted-foreground">{t("settings.theme")}</span>
          <Select
            value={prefTheme}
            onChange={(e) => onTheme(e.target.value as ThemeId)}
          >
            {THEMES.map((th) => (
              <option key={th.value} value={th.value}>
                {t(th.key)}
              </option>
            ))}
          </Select>
        </Card>
        <Card className="flex flex-col gap-1.5 p-3">
          <span className="text-xs text-muted-foreground">{t("settings.timezone")}</span>
          <Select
            value={prefTz}
            onChange={(e) => onTz(e.target.value)}
          >
            <option value="">{t("settings.tzAuto")}</option>
            {COMMON_TZ.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </Select>
        </Card>
      </div>
      <Button onClick={savePrefs}>
        {t("settings.savePrefs")}
      </Button>
      {prefMsg && <Alert variant="info">{prefMsg}</Alert>}
    </div>
  );
}
