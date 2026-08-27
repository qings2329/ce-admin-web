import { useState } from "react";
import { useAuth, hasPerm } from "../lib/auth";
import { useI18n, LOCALES } from "../i18n";
import { applyTheme, THEME_STORAGE_KEY, type ThemeId } from "../lib/theme";
import { Moon, Sun, LogOut } from "lucide-react";
import { Button } from "./ui/button";
import { Select } from "./ui/select";

// 全部导航项；带 perm 的项仅当当前管理员拥有该权限时显示。
const ALL_LINKS: { path: string; key: string; perm?: string }[] = [
  { path: "/dashboard", key: "nav.dashboard" },
  { path: "/risk", key: "nav.risk" },
  { path: "/users", key: "nav.users" },
  { path: "/symbols", key: "nav.symbols" },
  { path: "/ops", key: "nav.ops" },
  { path: "/deposits", key: "nav.deposits" },
  { path: "/deposit-addresses", key: "nav.depositAddresses" },
  { path: "/chains", key: "nav.chains" },
  { path: "/coins", key: "nav.coins" },
  { path: "/admins", key: "nav.admins", perm: "admin:manage" },
  { path: "/roles", key: "nav.roles", perm: "role:manage" },
  { path: "/announcements", key: "nav.announcements" },
  { path: "/notifications", key: "nav.notifications" },
  { path: "/orders", key: "nav.orders", perm: "trade:read" },
  { path: "/audit", key: "nav.audit", perm: "audit:read" },
  { path: "/apikeys", key: "nav.apikeys", perm: "apikey:read" },
  { path: "/lending", key: "nav.lending" },
  { path: "/bot", key: "nav.bot" },
  { path: "/referral", key: "nav.referral" },
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

  const toggleTheme = () => {
    const next: ThemeId = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  };

  return (
    <nav className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card px-3 py-2">
      <span className="text-sm font-bold text-primary">{t("nav.brand")}</span>
      <div className="flex flex-1 flex-wrap gap-1">
        {links.map((l) => (
          <a
            key={l.path}
            href={`#${l.path}`}
            className={
              current === l.path
                ? "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                : "rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            }
          >
            {t(l.key)}
          </a>
        ))}
      </div>
      <Select
        value={locale}
        onChange={(e) => setLocale(e.target.value as typeof locale)}
        aria-label={t("settings.language")}
      >
        {LOCALES.map((lc) => (
          <option key={lc.value} value={lc.value}>
            {lc.label}
          </option>
        ))}
      </Select>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label={t("settings.theme")}
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
      <Button variant="outline" size="sm" onClick={logout}>
        <LogOut className="h-3.5 w-3.5" />
        {t("nav.logout")}
      </Button>
    </nav>
  );
}
