import { useState } from "react";
import { useAuth, hasPerm } from "../lib/auth";
import { useI18n, LOCALES } from "../i18n";
import { applyTheme, THEMES, THEME_STORAGE_KEY, type ThemeId } from "../lib/theme";

// 全部导航项；带 perm 的项仅当当前管理员拥有该权限时显示。
const ALL_LINKS: { path: string; key: string; perm?: string }[] = [
  { path: "/dashboard", key: "nav.dashboard" },
  { path: "/risk", key: "nav.risk" },
  { path: "/users", key: "nav.users" },
  { path: "/symbols", key: "nav.symbols" },
  { path: "/ops", key: "nav.ops" },
  { path: "/deposits", key: "nav.deposits" },
  { path: "/chains", key: "nav.chains" },
  { path: "/coins", key: "nav.coins" },
  { path: "/admins", key: "nav.admins", perm: "admin:manage" },
  { path: "/roles", key: "nav.roles", perm: "role:manage" },
  { path: "/announcements", key: "nav.announcements" },
  { path: "/orders", key: "nav.orders", perm: "trade:read" },
  { path: "/audit", key: "nav.audit", perm: "audit:read" },
  { path: "/apikeys", key: "nav.apikeys", perm: "apikey:read" },
  { path: "/settings", key: "nav.settings" },
];

export function NavBar() {
  const { logout, perms } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const [theme, setTheme] = useState<ThemeId>(
    () => (localStorage.getItem(THEME_STORAGE_KEY) as ThemeId) || "dark",
  );

  const links = ALL_LINKS.filter((l) => !l.perm || hasPerm(perms, l.perm));
  const current = location.hash.replace(/^#/, "").split("?")[0];

  const onTheme = (v: ThemeId) => {
    setTheme(v);
    localStorage.setItem(THEME_STORAGE_KEY, v);
    applyTheme(v);
  };

  return (
    <nav className="navbar">
      <span className="brand">{t("nav.brand")}</span>
      <div className="nav-links">
        {links.map((l) => (
          <a
            key={l.path}
            href={`#${l.path}`}
            className={current === l.path ? "nav-link active" : "nav-link"}
          >
            {t(l.key)}
          </a>
        ))}
      </div>
      <select
        className="nav-select"
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        aria-label={t("settings.language")}
      >
        {LOCALES.map((lc) => (
          <option key={lc.value} value={lc.value}>
            {lc.label}
          </option>
        ))}
      </select>
      <select
        className="nav-select"
        value={theme}
        onChange={(e) => onTheme(e.target.value as ThemeId)}
        aria-label={t("settings.theme")}
      >
        {THEMES.map((th) => (
          <option key={th.value} value={th.value}>
            {t(th.key)}
          </option>
        ))}
      </select>
      <button className="btn-logout" onClick={logout}>
        {t("nav.logout")}
      </button>
    </nav>
  );
}
