import { useState, useEffect } from "react";
import { api } from "../api/client";
import { useI18n, LOCALES } from "../i18n";
import { applyTheme, THEMES, THEME_STORAGE_KEY, type ThemeId } from "../lib/theme";
import { getTimeZone, setTimeZone, COMMON_TZ } from "../lib/timezone";

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

  const loadMe = async () => {
    try {
      setMe(await api.me());
    } catch {
      /* 忽略 */
    }
  };
  useEffect(() => {
    loadMe();
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

  const savePrefs = () => {
    localStorage.setItem(THEME_STORAGE_KEY, prefTheme);
    applyTheme(prefTheme);
    setTimeZone(prefTz);
    setPrefMsg(t("settings.prefSaved"));
  };

  const onTheme = (v: ThemeId) => setPrefTheme(v);

  return (
    <div className="page">
      <h1>{t("settings.title")}</h1>
      {(pwMsg || mfaMsg) && <div className="alert-info">{pwMsg || mfaMsg}</div>}

      {me && (
        <div className="kv-grid">
          <div className="kv">
            <span className="kv-k">{t("settings.currentAccount")}</span>
            <span className="kv-v">{me.username}</span>
          </div>
          <div className="kv">
            <span className="kv-k">{t("col.role")}</span>
            <span className="kv-v">{me.role_name}</span>
          </div>
          <div className="kv">
            <span className="kv-k">{t("settings.mfaStatus")}</span>
            <span className="kv-v">{me.totp_enabled ? t("common.enabled") : t("common.disabled")}</span>
          </div>
        </div>
      )}

      <h2>{t("settings.changePwd")}</h2>
      <form className="inline-form" onSubmit={changePw}>
        <input
          placeholder={t("settings.oldPwd")}
          type="password"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
        />
        <input
          placeholder={t("settings.newPwd")}
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
        />
        <button className="btn" type="submit">
          {t("settings.changePwd")}
        </button>
      </form>

      <h2>{t("settings.mfa")}</h2>
      {me?.totp_enabled ? (
        <div className="panel">
          <p>{t("settings.mfaEnabledNote")}</p>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              disable();
            }}
          >
            <input
              placeholder={t("settings.curCodePh")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn" type="submit">
              {t("settings.disableMfa")}
            </button>
          </form>
        </div>
      ) : setup ? (
        <div className="panel">
          <p>{t("settings.step1")}</p>
          <pre className="secret-box">{setup.secret}</pre>
          <p>{t("settings.step2otp")}</p>
          <pre className="secret-box">{setup.otpauth_uri}</pre>
          <p>{t("settings.step2")}</p>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              enable();
            }}
          >
            <input
              placeholder={t("settings.codePh")}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn" type="submit">
              {t("settings.enableMfa")}
            </button>
          </form>
        </div>
      ) : (
        <div className="panel">
          <p>{t("settings.notEnabled")}</p>
          <button className="btn" onClick={startSetup}>
            {t("settings.bind")}
          </button>
        </div>
      )}

      <h2>{t("settings.preferences")}</h2>
      <div className="kv-grid">
        <div className="kv">
          <span className="kv-k">{t("settings.language")}</span>
          <select
            className="nav-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value as typeof locale)}
          >
            {LOCALES.map((lc) => (
              <option key={lc.value} value={lc.value}>
                {lc.label}
              </option>
            ))}
          </select>
        </div>
        <div className="kv">
          <span className="kv-k">{t("settings.theme")}</span>
          <select
            className="nav-select"
            value={prefTheme}
            onChange={(e) => onTheme(e.target.value as ThemeId)}
          >
            {THEMES.map((th) => (
              <option key={th.value} value={th.value}>
                {t(th.key)}
              </option>
            ))}
          </select>
        </div>
        <div className="kv">
          <span className="kv-k">{t("settings.timezone")}</span>
          <select
            className="nav-select"
            value={prefTz}
            onChange={(e) => setPrefTz(e.target.value)}
          >
            <option value="">{t("settings.tzAuto")}</option>
            {COMMON_TZ.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>
      <button className="btn" onClick={savePrefs}>
        {t("settings.savePrefs")}
      </button>
      {prefMsg && <div className="alert-info">{prefMsg}</div>}
    </div>
  );
}
