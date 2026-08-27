import { useState } from "react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../api/client";
import { useI18n } from "../i18n";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Alert } from "../components/ui/alert";

export function Login() {
  const { login } = useAuth();
  const { t } = useI18n();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin!@#%");
  const [totp, setTotp] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // 因 token 过期被强制跳回登录页时显示提示（读取一次性标记）。
  const [expired, setExpired] = useState(
    () => sessionStorage.getItem("auth_expired") === "1",
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setExpired(false);
    setBusy(true);
    try {
      await login(username, password, totp || undefined);
      sessionStorage.removeItem("auth_expired");
      location.hash = "/risk";
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : t("login.failed");
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <form
        onSubmit={submit}
        className="w-[320px] rounded-xl border border-border bg-card p-6 shadow-lg"
      >
        <h1 className="mb-4 text-center text-lg font-semibold text-foreground">
          {t("login.title")}
        </h1>
        {expired && (
          <Alert variant="warn" className="mb-3">
            {t("login.expired")}
          </Alert>
        )}
        {err && (
          <Alert variant="error" className="mb-3">
            {err}
          </Alert>
        )}
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("login.username")}
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("login.password")}
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            {t("login.totp")}
            <Input
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              placeholder={t("login.totpPh")}
              inputMode="numeric"
            />
          </label>
          <Button type="submit" disabled={busy} className="mt-1 w-full">
            {busy ? t("login.submitting") : t("login.submit")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("login.demoHint")}</p>
        </div>
      </form>
    </div>
  );
}
