import { useState } from "react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../api/client";
import { useI18n } from "../i18n";

export function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin!@#%");
  const [totp, setTotp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try {
      await login(username, password, totp || undefined);
      location.hash = "/risk";
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("login.failed");
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>{t("login.title")}</h1>
        {err && <div className="alert-error">{err}</div>}
        <label>
          {t("login.username")}
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          {t("login.password")}
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          {t("login.totp")}
          <input
            value={totp}
            onChange={(e) => setTotp(e.target.value)}
            placeholder={t("login.totpPh")}
            inputMode="numeric"
          />
        </label>
        <button className="btn-primary" disabled={busy}>
          {busy ? t("login.submitting") : t("login.submit")}
        </button>
        <p className="muted">{t("login.demoHint")}</p>
      </form>
    </div>
  );
}
