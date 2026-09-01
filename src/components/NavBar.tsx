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
  { path: "/risk-manage", key: "nav.riskManage", perm: "risk:view" },
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
  { path: "/orders", key: "nav.orders", perm: "trade:view" },
  { path: "/audit", key: "nav.audit", perm: "audit:view" },
  { path: "/apikeys", key: "nav.apikeys", perm: "apikey:view" },
  { path: "/lending", key: "nav.lending" },
  { path: "/bot", key: "nav.bot" },
  { path: "/referral", key: "nav.referral" },
  { path: "/futures", key: "nav.futures", perm: "futures:view" },
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
    <nav className="sticky top-0 z-10 flex h-screen w-60 shrink-0 self-start flex-col border-r border-border bg-card">
      <div className="px-4 py-4 text-base font-bold text-primary">
        {t("nav.brand")}
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto px-3">
        {links.map((l) => (
          <a
            key={l.path}
            href={`#${l.path}`}
            className={
              current === l.path
                ? "block rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
                : "block rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            }
          >
            {t(l.key)}
          </a>
        ))}
      </div>
      <div className="flex flex-col gap-2 border-t border-border p-3">
        <Select
          value={locale}
          onChange={(e) => setLocale(e.target.value as typeof locale)}
          aria-label={t("settings.language")}
          className="w-full"
        >
          {LOCALES.map((lc) => (
            <option key={lc.value} value={lc.value}>
              {lc.label}
            </option>
          ))}
        </Select>
        <Button
          variant="ghost"
          onClick={toggleTheme}
          className="w-full justify-start"
          aria-label={t("settings.theme")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{t("settings.theme")}</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="w-full justify-start"
        >
          <LogOut className="h-3.5 w-3.5" />
          {t("nav.logout")}
        </Button>
      </div>
    </nav>
  );
}
