import { useEffect, useMemo, useRef, useState } from "react";
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
  Command,
  FileText,
  User as UserIcon,
  Hash,
  CornerDownLeft,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Select } from "../ui/select";
import { cn } from "../../lib/utils";

type AlertLevel = "critical" | "warning" | "info";

function AlertDot({ level }: { level: AlertLevel }) {
  const colors = { critical: "bg-destructive", warning: "bg-warning", info: "bg-info" };
  return <span className={`inline-block h-2 w-2 rounded-full ${colors[level]}`} />;
}

// ─── 实时告警面板（数据来自 /api/admin/notifications）──────────────────────────

// ─── 全局极速搜索（Command Palette：Cmd+K / Ctrl+K）──────────────────────────
// 混合搜索：菜单/页面名称 + UID / 邮箱 / 手机 / TXID / 订单号，命中后直达目标页。

type PaletteItem = {
  id: string;
  group: "page" | "user" | "order" | "lookup";
  label: string;
  hint: string;
  path: string;
};

export function GlobalSearchModal() {
  const { t } = useI18n();
  const { searchOpen, searchQuery, closeSearch, setSearchQuery } = useGlobalStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (searchOpen) {
      setActive(0);
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

  // ── 页面索引（与 PAGES / 侧边栏菜单对齐）──
  const pageIndex: { path: string; key: string }[] = [
    { path: "/dashboard", key: "nav.dashboard" },
    { path: "/risk", key: "nav.risk" },
    { path: "/risk-dashboard", key: "nav.riskDashboard" },
    { path: "/kyc-review", key: "nav.kycReview" },
    { path: "/large-withdrawal-review", key: "nav.withdrawalReview" },
    { path: "/deposits", key: "nav.deposits" },
    { path: "/users", key: "nav.users" },
    { path: "/deposit-addresses", key: "nav.depositAddresses" },
    { path: "/orders", key: "nav.orders" },
    { path: "/symbols", key: "nav.symbols" },
    { path: "/coins", key: "nav.coins" },
    { path: "/chains", key: "nav.chains" },
    { path: "/c2c", key: "nav.c2c" },
    { path: "/admins", key: "nav.admins" },
    { path: "/roles", key: "nav.roles" },
    { path: "/announcements", key: "nav.announcements" },
    { path: "/notifications", key: "nav.notifications" },
    { path: "/apikeys", key: "nav.apikeys" },
    { path: "/lending", key: "nav.lending" },
    { path: "/bot", key: "nav.bot" },
    { path: "/referral", key: "nav.referral" },
    { path: "/settings", key: "nav.settings" },
    { path: "/audit", key: "nav.audit" },
  ];

  const items: PaletteItem[] = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const result: PaletteItem[] = [];

    const pushPage = (path: string, label: string) =>
      result.push({
        id: `p|${path}`,
        group: "page",
        label,
        hint: path,
        path,
      });

    // 1) 页面匹配
    for (const p of pageIndex) {
      const label = t(p.key).toLowerCase();
      const hay = `${label} ${p.path} ${p.key}`.toLowerCase();
      if (q && hay.includes(q)) pushPage(p.path, t(p.key));
    }
    // 空查询时展示部分常用页面
    if (!q) {
      for (const p of [
        "/dashboard",
        "/users",
        "/orders",
        "/deposits",
        "/c2c",
        "/risk",
        "/audit",
        "/admins",
      ]) {
        const idx = pageIndex.find((x) => x.path === p);
        if (idx) pushPage(p, t(idx.key));
      }
    }

    // 2) 定向查询（UID / 邮箱 / 手机 / 订单号 / TXID）
    const raw = searchQuery.trim();
    const isNumeric = /^\d{3,}$/.test(raw);
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
    const isPhone = /^\+?\d{6,15}$/.test(raw);

    if (raw) {
      const enc = encodeURIComponent(raw);
      if (isNumeric) {
        result.push({
          id: `u|${raw}`,
          group: "user",
          label: t("search.lookupUser", { q: raw }),
          hint: `${t("col.userId")} · ${t("search.withQuery")}`,
          path: `#/users?q=${enc}`,
        });
        result.push({
          id: `o|${raw}`,
          group: "order",
          label: t("search.lookupOrder", { q: raw }),
          hint: `${t("col.userId")} · ${t("search.withQuery")}`,
          path: `#/orders?user_id=${enc}`,
        });
      } else if (isEmail) {
        result.push({
          id: `ue|${raw}`,
          group: "user",
          label: t("search.lookupEmail", { q: raw }),
          hint: `${t("col.email")} · ${t("search.withQuery")}`,
          path: `#/users?q=${enc}`,
        });
      } else if (isPhone) {
        result.push({
          id: `up|${raw}`,
          group: "user",
          label: t("search.lookupPhone", { q: raw }),
          hint: `${t("search.phone")} · ${t("search.withQuery")}`,
          path: `#/users?q=${enc}`,
        });
      } else if (raw.length >= 6) {
        result.push({
          id: `ox|${raw}`,
          group: "order",
          label: t("search.lookupTxid", { q: raw }),
          hint: `${t("col.orderId")} / ${t("col.txHash")} · ${t("search.withQuery")}`,
          path: `#/orders?q=${enc}`,
        });
      }
    }

    return result.slice(0, 50);
  }, [searchQuery, t, pageIndex]);

  const itemsRef = useRef<PaletteItem[]>(items);
  itemsRef.current = items;

  const go = (item: PaletteItem) => {
    location.hash = item.path;
    closeSearch();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const list = itemsRef.current;
    if (list.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % list.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a - 1 + list.length) % list.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = list[Math.min(active, list.length - 1)];
      if (it) go(it);
    }
  };

  useEffect(() => setActive(0), [searchQuery]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!searchOpen) return null;

  const groupIcon = (g: PaletteItem["group"]) => {
    switch (g) {
      case "user":
        return <UserIcon className="h-4 w-4 text-info" />;
      case "order":
        return <Hash className="h-4 w-4 text-warning" />;
      case "lookup":
        return <Search className="h-4 w-4 text-muted-foreground" />;
      default:
        return <FileText className="h-4 w-4 text-primary" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeSearch} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-lg border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={t("search.placeholder")}
            className="h-8 border-0 bg-transparent px-0 text-sm focus-visible:ring-0"
          />
          <button onClick={closeSearch} className="rounded-md p-1 text-muted-foreground hover:bg-accent">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5 scrollbar-thin">
          {items.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t("search.empty")}
            </div>
          ) : (
            <>
              {items[0].group !== "page" && (
                <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("search.lookupGroup")}
                </div>
              )}
              <div className="mb-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {t("search.pagesGroup")}
              </div>
              {items.map((it, idx) => (
                <button
                  key={it.id}
                  data-idx={idx}
                  onClick={() => go(it)}
                  onMouseEnter={() => setActive(idx)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm",
                    idx === active ? "bg-accent text-accent-foreground" : "text-foreground",
                  )}
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                    {groupIcon(it.group)}
                  </span>
                  <span className="flex-1 truncate">{it.label}</span>
                  <span className="hidden text-[10px] text-muted-foreground sm:inline">{it.hint}</span>
                  {idx === active && <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Command className="h-3 w-3" /> <ArrowRight className="h-3 w-3" /> {t("search.nav")}
            </span>
            <span className="flex items-center gap-1">↑↓ {t("search.move")}</span>
            <span className="flex items-center gap-1">↵ {t("search.select")}</span>
            <span className="flex items-center gap-1">esc {t("search.close")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── 通知中心面板（真实数据，来源 /api/admin/notifications）───────────────────
export function NotifPanel() {
  const { t } = useI18n();
  const { notifOpen, closeNotif } = useGlobalStore();
  const [alerts, setAlerts] = useState<
    { id: number; level: AlertLevel; msg: string; time: string }[]
  >([]);

  useEffect(() => {
    if (!notifOpen) return;
    let alive = true;
    import("../../api/client")
      .then(({ api }) => api.listNotifications({ limit: 20 }))
      .then((data: any) => {
        if (!alive) return;
        const now = Date.now();
        const items: any[] = data?.items ?? [];
        setAlerts(
          items.map((n: any) => ({
            id: n.id,
            level: n.level === "critical" || n.level === "warning" ? n.level : "info",
            msg: n.title || n.body || "",
            time: relTime(now, n.created_at),
          })),
        );
      })
      .catch(() => {
        if (alive) setAlerts([]);
      });
    return () => {
      alive = false;
    };
  }, [notifOpen]);

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
          {alerts.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {t("riskdash.noAlerts")}
            </p>
          ) : (
            alerts.map((a) => (
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
            ))
          )}
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

// relTime 将 created_at 转为中文相对时间（x 秒/分钟/小时/天前）。
function relTime(now: number, created: string | number) {
  const t = new Date(created).getTime();
  if (isNaN(t)) return "-";
  const s = Math.max(0, Math.floor((now - t) / 1000));
  if (s < 60) return `${s} 秒前`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  return `${Math.floor(h / 24)} 天前`;
}

// ─── 顶部 Header ──────────────────────────────────────────────────────────────
export function Header() {
  const { t, locale, setLocale } = useI18n();
  const { role, logout, refreshMe } = useAuth();
  const { openSearch, toggleNotif, privacyMode, togglePrivacy } = useGlobalStore();
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

  const roleTag = role === "super_admin"
    ? { label: "Super Admin", tone: "destructive" as const }
    : role === "compliance"
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

      {/* 防旁观模式（隐私打码） */}
      <Button
        variant="ghost"
        size="icon"
        onClick={togglePrivacy}
        className={`h-7 w-7 relative ${privacyMode ? "text-destructive" : "text-muted-foreground"}`}
        title={privacyMode ? t("privacy.disable") : t("privacy.enable")}
      >
        {privacyMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        {privacyMode && (
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-destructive" />
        )}
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
