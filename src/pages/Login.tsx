import { useState } from "react";
import { useAuth } from "../lib/auth";
import { ApiError } from "../api/client";

export function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
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
      const msg = e instanceof ApiError ? e.message : "登录失败";
      setErr(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <h1>管理后台登录</h1>
        {err && <div className="alert-error">{err}</div>}
        <label>
          用户名
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </label>
        <label>
          密码
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label>
          动态码（若已启用两步验证）
          <input
            value={totp}
            onChange={(e) => setTotp(e.target.value)}
            placeholder="6 位 Google 验证器动态码"
            inputMode="numeric"
          />
        </label>
        <button className="btn-primary" disabled={busy}>
          {busy ? "登录中…" : "登录"}
        </button>
        <p className="muted">默认凭据 admin / admin123（原型）</p>
      </form>
    </div>
  );
}
