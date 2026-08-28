import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth";
import { useGlobalStore } from "../../store/useGlobalStore";
import { useI18n } from "../../i18n";
import { applyTheme, THEME_STORAGE_KEY, type ThemeId } from "../../lib/theme";
import {
  Search,
  Bell,
  Moon,
  Sun,
  LogOut,
  X,
  UserCircle,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Select } from "../ui/select";

type AlertLevel = "critical" | "warning" | "info";

function AlertDot({ level }: { level: AlertLevel }) {
  const colors = { critical: "bg-destructive", warning: "bg-warning", info: "bg-info" };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[level]}`} />;
}

// ─── 模拟风控告警数据（接入真实 WebSocket 后替换）─────────────────────────────
const MOCK_ALERTS = [
  { id: 1, level: "critical" as AlertLevel, msg: "用户 #10023 触发大额提币风控，金额 500,000 USDT", time: "2 分钟前" },
  { id: 2, level: "warning" as AlertLevel, msg: "IP 异常登录检测：UID #8847 从新地域登录", time: "15 分钟前" },
  { id: 3, level: "info" as AlertLevel, msg: "系统对账完成，差异金额 0.00", time: "1 小时前" },
];

// ─── 全局搜索弹窗 ─────────────────────────────────────────────────────────────
export function GlobalSearchModal() {
  const { t } = useI18n();
  const { searchOpen, searchQuery, closeSearch, setSearchQuery } = useGlobalStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        useGlobalStore.getState().openSearch();
      }
      if (e.key === "Escape") useGlobalStore.getState().closeSearch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!searchOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSearch} />
      <div className="relative w-full max-w-xl rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder={`${t("header.searchPh")} UID / 邮箱 / TXID …  （Ctrl+K）`}
            className="h-8 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
          />
          <button onClick={closeSearch} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {searchQuery.length >= 2 ? (
            <div className="px-2 py-1 text-xs text-muted-foreground">
              搜索结果将接入真实 API（uid/email/txid 模糊匹配）
            </div>
          ) : (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              输入至少 2 个字符开始搜索
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 通知中心面板 ─────────────────────────────────────────────────────────────
export function NotifPanel() {
  const { t } = useI18n();
  const { notifOpen, closeNotif } = useGlobalStore();

  if (!notifOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={closeNotif} />
      <div className="fixed right-4 top-12 z-50 w-80 rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <span className="text-sm font-semibold">{t("header.notifications")}</span>
          <button onClick={closeNotif} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-96 overflow-y-auto scrollbar-thin">
          {MOCK_ALERTS.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-2.5 border-b border-border px-3 py-2.5 hover:bg-accent"
            >
              <AlertDot level={a.level} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">{a.msg}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{a.time}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-3 py-2 text-center">
          <a href="#/risk" onClick={closeNotif} className="text-xs text-primary hover:underline">
            {t("header.viewAllRisk")}
          </a>
        </div>
      </div>
    </>
  );
}

// ─── 顶部 Header ──────────────────────────────────────────────────────────────
export function Header() {
  const { t, locale, setLocale } = useI18n();
  const { perms, logout, refreshMe } = useAuth();
  const { openSearch, toggleNotif } = useGlobalStore();
  const [theme, setTheme] = useState<ThemeId>(
    () => (localStorage.getItem(THEME_STORAGE_KEY) as ThemeId) || "dark",
  );
  const [adminInfo, setAdminInfo] = useState<any>(null);

  useEffect(() => {
    void refreshMe();
    import("../../api/client").then(({ api }) =>
      api.me().then((me: any) => setAdminInfo(me)).catch(() => {}),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleTag = perms.includes("super_admin")
    ? { label: "Super Admin", tone: "destructive" as const }
    : perms.includes("compliance")
      ? { label: "Compliance", tone: "warning" as const }
      : { label: "Operator", tone: "info" as const };

  const toggleTheme = () => {
    const next: ThemeId = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    applyTheme(next);
  };

  return (
    <header className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-border bg-[hsl(var(--header-bg))] px-3">
      {/* 全局搜索 */}
      <Button
        variant="outline"
        size="sm"
        onClick={openSearch}
        className="h-7 gap-2 border-dashed text-xs text-muted-foreground hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{t("header.search")}</span>
        <kbd className="ml-auto hidden rounded border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground md:inline">
          ⌘K
        </kbd>
      </Button>

      <div className="flex-1" />

      {/* 通知 */}
      <Button variant="ghost" size="icon" onClick={toggleNotif} className="h-7 w-7 relative" title={t("header.notifications")}>
        <Bell className="h-4 w-4" />
        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
          3
        </span>
      </Button>

      {/* 主题切换 */}
      <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-7 w-7" title={t("settings.theme")}>
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      {/* 语言选择 */}
      <Select
        value={locale}
        onChange={(e: { target: { value: string } }) => setLocale(e.target.value as typeof locale)}
        aria-label={t("settings.language")}
        className="h-7 w-20"
      >
        {["zh-CN", "en-US", "zh-TW", "ja-JP"].map((lc) => (
          <option key={lc} value={lc}>
            {lc === "zh-CN" ? "中文" : lc === "en-US" ? "EN" : lc === "zh-TW" ? "繁中" : "日語"}
          </option>
        ))}
      </Select>

      {/* 管理员信息 */}
      <div className="flex items-center gap-2 border-l border-border pl-2">
        {adminInfo ? (
          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium">{adminInfo.username ?? "admin"}</span>
              <Badge variant={roleTag.tone} className="text-[10px] font-normal">
                {roleTag.label}
              </Badge>
            </div>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">loading…</span>
        )}
        <Button variant="ghost" size="sm" onClick={logout} className="h-7 gap-1.5 text-xs text-muted-foreground">
          <LogOut className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t("nav.logout")}</span>
        </Button>
      </div>

      <GlobalSearchModal />
      <NotifPanel />
    </header>
  );
}
