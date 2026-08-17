import { useState, useEffect } from "react";
import { api } from "../api/client";

export function Settings() {
  const [me, setMe] = useState<any>(null);
  const [oldPw, setOldPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  const [setup, setSetup] = useState<{ secret: string; otpauth_uri: string } | null>(null);
  const [code, setCode] = useState("");
  const [mfaMsg, setMfaMsg] = useState<string | null>(null);

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
      setPwMsg("密码已修改");
      setOldPw("");
      setNewPw("");
    } catch (e: any) {
      setPwMsg(e?.message ?? "修改失败");
    }
  };

  const startSetup = async () => {
    setMfaMsg(null);
    try {
      setSetup(await api.mfaSetup());
    } catch (e: any) {
      setMfaMsg(e?.message ?? "初始化失败");
    }
  };
  const enable = async () => {
    if (!setup) return;
    setMfaMsg(null);
    try {
      await api.mfaEnable(code);
      setMfaMsg("MFA 已启用");
      setSetup(null);
      setCode("");
      loadMe();
    } catch (e: any) {
      setMfaMsg(e?.message ?? "启用失败");
    }
  };
  const disable = async () => {
    setMfaMsg(null);
    try {
      await api.mfaDisable(code || undefined);
      setMfaMsg("MFA 已关闭");
      setCode("");
      loadMe();
    } catch (e: any) {
      setMfaMsg(e?.message ?? "关闭失败");
    }
  };

  return (
    <div className="page">
      <h1>安全设置</h1>
      {(pwMsg || mfaMsg) && <div className="alert-info">{pwMsg || mfaMsg}</div>}

      {me && (
        <div className="kv-grid">
          <div className="kv">
            <span className="kv-k">当前账户</span>
            <span className="kv-v">{me.username}</span>
          </div>
          <div className="kv">
            <span className="kv-k">角色</span>
            <span className="kv-v">{me.role_name}</span>
          </div>
          <div className="kv">
            <span className="kv-k">MFA 状态</span>
            <span className="kv-v">{me.totp_enabled ? "已启用" : "未启用"}</span>
          </div>
        </div>
      )}

      <h2>修改密码</h2>
      <form className="inline-form" onSubmit={changePw}>
        <input
          placeholder="旧密码"
          type="password"
          value={oldPw}
          onChange={(e) => setOldPw(e.target.value)}
        />
        <input
          placeholder="新密码（至少 6 位）"
          type="password"
          value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
        />
        <button className="btn" type="submit">
          修改密码
        </button>
      </form>

      <h2>Google 验证器（两步验证）</h2>
      {me?.totp_enabled ? (
        <div className="panel">
          <p>MFA 已启用，登录时需输入动态码。关闭请先输入当前 6 位动态码：</p>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              disable();
            }}
          >
            <input
              placeholder="当前动态码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn" type="submit">
              关闭 MFA
            </button>
          </form>
        </div>
      ) : setup ? (
        <div className="panel">
          <p>1. 在 Google Authenticator 中选择「手动输入设置项」，填入下方密钥：</p>
          <pre className="secret-box">{setup.secret}</pre>
          <p>或在兼容应用中使用 otpauth URI：</p>
          <pre className="secret-box">{setup.otpauth_uri}</pre>
          <p>2. 输入 6 位动态码以启用：</p>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              enable();
            }}
          >
            <input
              placeholder="6 位动态码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button className="btn" type="submit">
              启用 MFA
            </button>
          </form>
        </div>
      ) : (
        <div className="panel">
          <p>尚未启用两步验证。启用后登录需输入动态码，显著提升账户安全。</p>
          <button className="btn" onClick={startSetup}>
            开始绑定
          </button>
        </div>
      )}
    </div>
  );
}
