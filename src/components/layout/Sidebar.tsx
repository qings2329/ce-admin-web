import { useEffect, useState } from "react";
import { useGlobalStore } from "../../store/useGlobalStore";
import { useI18n } from "../../i18n";
import { cn } from "../../lib/utils";
import {
  LayoutDashboard,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
  TrendingUp,
  Coins,
  Link as LinkIcon,
  UserCog,
  Key,
  FileText,
  Settings,
  Bell,
  Megaphone,
  Bot,
  ChevronRight,
  ChevronDown,
  CircleDollarSign,
  Scale,
  Activity,
  ArrowLeftRight,
  KeyRound,
  Package,
  Gift,
  Link,
  FileSearch,
  PieChart,
} from "lucide-react";
import type { MenuItem, PermissionKey } from "../../lib/permissions";

function NavIcon({ name }: { name?: string }) {
  const icons: Record<string, React.ReactNode> = {
    LayoutDashboard: <LayoutDashboard className="h-4 w-4 shrink-0" />,
    ShieldAlert: <ShieldAlert className="h-4 w-4 shrink-0" />,
    ShieldCheck: <ShieldCheck className="h-4 w-4 shrink-0" />,
    Users: <Users className="h-4 w-4 shrink-0" />,
    Wallet: <Wallet className="h-4 w-4 shrink-0" />,
    TrendingUp: <TrendingUp className="h-4 w-4 shrink-0" />,
    Coins: <Coins className="h-4 w-4 shrink-0" />,
    LinkIcon: <LinkIcon className="h-4 w-4 shrink-0" />,
    Link: <Link className="h-4 w-4 shrink-0" />,
    UserCog: <UserCog className="h-4 w-4 shrink-0" />,
    Key: <Key className="h-4 w-4 shrink-0" />,
    KeyRound: <KeyRound className="h-4 w-4 shrink-0" />,
    FileText: <FileText className="h-4 w-4 shrink-0" />,
    Settings: <Settings className="h-4 w-4 shrink-0" />,
    Bell: <Bell className="h-4 w-4 shrink-0" />,
    Megaphone: <Megaphone className="h-4 w-4 shrink-0" />,
    Bot: <Bot className="h-4 w-4 shrink-0" />,
    CircleDollarSign: <CircleDollarSign className="h-4 w-4 shrink-0" />,
    Scale: <Scale className="h-4 w-4 shrink-0" />,
    Activity: <Activity className="h-4 w-4 shrink-0" />,
    ArrowLeftRight: <ArrowLeftRight className="h-4 w-4 shrink-0" />,
    Tool: <Package className="h-4 w-4 shrink-0" />,
    Gift: <Gift className="h-4 w-4 shrink-0" />,
    FileSearch: <FileSearch className="h-4 w-4 shrink-0" />,
    PieChart: <PieChart className="h-4 w-4 shrink-0" />,
  };
  return icons[name ?? ""] ?? null;
}

// ─── 菜单定义 ─────────────────────────────────────────────────────────────────
const MENU_ITEMS: MenuItem[] = [
  // ── 运营 ──────────────────────────────────────────────────────────────────
  {
    group: "ops",
    label: "nav.opsGroup",
    icon: "LayoutDashboard",
    children: [
      {
        path: "/dashboard",
        label: "nav.dashboard",
        icon: "LayoutDashboard",
        perm: "ops:view" as PermissionKey,
      },
      {
        path: "/ops",
        label: "nav.ops",
        icon: "TrendingUp",
        perm: "ops:view" as PermissionKey,
      },
    ],
  },

  // ── 风控 ──────────────────────────────────────────────────────────────────
  {
    group: "risk",
    label: "nav.riskGroup",
    icon: "ShieldAlert",
    children: [
      {
        path: "/risk-dashboard",
        label: "nav.riskDashboard",
        icon: "ShieldAlert",
        perm: "risk:view" as PermissionKey,
      },
      {
        path: "/risk",
        label: "nav.risk",
        icon: "Activity",
        perm: "risk:view" as PermissionKey,
      },
    ],
  },

  // ── 用户 ──────────────────────────────────────────────────────────────────
  {
    group: "users",
    label: "nav.usersGroup",
    icon: "Users",
    children: [
      {
        path: "/users",
        label: "nav.users",
        icon: "Users",
        perm: "user:view" as PermissionKey,
      },
      {
        path: "/kyc-review",
        label: "nav.kycReview",
        icon: "FileSearch",
        perm: "user:view" as PermissionKey,
      },
    ],
  },

  // ── 资金 ──────────────────────────────────────────────────────────────────
  {
    group: "finance",
    label: "nav.financeGroup",
    icon: "Wallet",
    children: [
      {
        path: "/deposits",
        label: "nav.deposits",
        icon: "CircleDollarSign",
        perm: "finance:view" as PermissionKey,
      },
      {
        path: "/large-withdrawal-review",
        label: "nav.withdrawalReview",
        icon: "ShieldCheck",
        perm: "finance:approve" as PermissionKey,
      },
      {
        path: "/c2c",
        label: "nav.c2c",
        icon: "ArrowLeftRight",
        perm: "c2c:view" as PermissionKey,
      },
      {
        path: "/deposit-addresses",
        label: "nav.depositAddresses",
        icon: "Link",
        perm: "user:view" as PermissionKey,
      },
    ],
  },

  // ── 交易 ──────────────────────────────────────────────────────────────────
  {
    group: "trade",
    label: "nav.tradeGroup",
    icon: "Scale",
    children: [
      {
        path: "/orders",
        label: "nav.orders",
        icon: "FileText",
        perm: "trade:view" as PermissionKey,
      },
      {
        path: "/symbols",
        label: "nav.symbols",
        icon: "Coins",
        perm: "system:config" as PermissionKey,
      },
      {
        path: "/coins",
        label: "nav.coins",
        icon: "Coins",
        perm: "system:config" as PermissionKey,
      },
      {
        path: "/chains",
        label: "nav.chains",
        icon: "Link",
        perm: "system:config" as PermissionKey,
      },
    ],
  },

  // ── 系统 ──────────────────────────────────────────────────────────────────
  {
    group: "system",
    label: "nav.systemGroup",
    icon: "Settings",
    children: [
      {
        path: "/admins",
        label: "nav.admins",
        icon: "UserCog",
        perm: "admin:manage" as PermissionKey,
      },
      {
        path: "/roles",
        label: "nav.roles",
        icon: "Key",
        perm: "role:manage" as PermissionKey,
      },
      {
        path: "/apikeys",
        label: "nav.apikeys",
        icon: "KeyRound",
        perm: "apikey:view" as PermissionKey,
      },
      {
        path: "/audit",
        label: "nav.audit",
        icon: "FileSearch",
        perm: "audit:view" as PermissionKey,
      },
    ],
  },

  // ── 运营工具 ───────────────────────────────────────────────────────────────
  {
    group: "tools",
    label: "nav.toolsGroup",
    icon: "Tool",
    children: [
      {
        path: "/announcements",
        label: "nav.announcements",
        icon: "Megaphone",
        perm: "announcement:write" as PermissionKey,
      },
      {
        path: "/notifications",
        label: "nav.notifications",
        icon: "Bell",
        perm: "notification:write" as PermissionKey,
      },
      {
        path: "/lending",
        label: "nav.lending",
        icon: "Wallet",
      },
      {
        path: "/wealth",
        label: "nav.wealth",
        icon: "PieChart",
      },
      {
        path: "/bot",
        label: "nav.bot",
        icon: "Bot",
      },
      {
        path: "/referral",
        label: "nav.referral",
        icon: "Gift",
      },
    ],
  },

  // ── 个人设置 ───────────────────────────────────────────────────────────────
  {
    path: "/settings",
    label: "nav.settings",
    icon: "Settings",
    perm: "sys:settings" as PermissionKey,
  },
];

function NavItem({
  item,
  collapsed,
}: {
  item: MenuItem;
  collapsed: boolean;
}) {
  const { t } = useI18n();
  const expandedGroups = useGlobalStore((s: { expandedGroups: Record<string, boolean> }) => s.expandedGroups);
  const toggleGroup = useGlobalStore((s: { toggleGroup: (g: string) => void }) => s.toggleGroup);
  const current = location.hash.replace(/^#/, "").split("?")[0];

  const hasChildren = item.children && item.children.length > 0;
  const isGroup = !!item.group;
  const isActive = item.path && current === item.path;
  const isExpanded = isGroup ? expandedGroups[item.group!] : false;

  if (hasChildren && isGroup) {
    return (
      <div>
        <button
          onClick={() => item.group && toggleGroup(item.group)}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left transition-colors",
            "text-base font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground hover:bg-accent",
          )}
        >
          <NavIcon name={item.icon} />
          {!collapsed && <span className="flex-1">{t(item.label)}</span>}
          {!collapsed && (
            <ChevronDown
              className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")}
            />
          )}
        </button>
        {isExpanded && !collapsed && (
          <div className="ml-4 space-y-0.5 border-l border-border pl-2">
            {item.children!.map((child: MenuItem) => (
              <NavItem key={child.path} item={child} collapsed={false} />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (item.path) {
    return (
      <a
        href={`#${item.path}`}
        className={cn(
          "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-all",
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
        title={collapsed ? t(item.label) : undefined}
      >
        <NavIcon name={item.icon} />
        {!collapsed && <span className="truncate">{t(item.label)}</span>}
        {collapsed && (
          <div className="mx-auto flex h-5 w-5 items-center justify-center">
            <NavIcon name={item.icon} />
          </div>
        )}
      </a>
    );
  }

  return null;
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useGlobalStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // 确保所有分组默认展开（即使 localStorage 有旧状态）
    const { expandedGroups } = useGlobalStore.getState();
    const groups = ["ops", "risk", "finance", "users", "trade", "system", "tools"];
    const toExpand = groups.filter((g) => !expandedGroups[g]);
    if (toExpand.length > 0) {
      const { toggleGroup } = useGlobalStore.getState();
      toExpand.forEach((g) => toggleGroup(g));
    }
  }, []);

  const visibleItems = MENU_ITEMS.filter((item: MenuItem) => {
    // 菜单不根据权限过滤：即使没有权限也显示菜单，权限由页面内按钮控制
    if (item.children) {
      return item.children.length > 0;
    }
    return true;
  });

  if (!mounted) return null;

  return (
    <aside
      className={cn(
        "relative flex shrink-0 flex-col border-r bg-[hsl(var(--sidebar-bg))] transition-all duration-200 ease-in-out",
        sidebarCollapsed ? "w-16" : "w-56",
      )}
    >
      <div
        className={cn(
          "flex h-12 items-center border-b border-border px-3",
          sidebarCollapsed ? "justify-center" : "justify-between",
        )}
      >
        <span className="text-sm font-bold tracking-wide text-primary">
          CE ADMIN
        </span>
        {!sidebarCollapsed && (
          <span className="text-[10px] text-muted-foreground">Exchange</span>
        )}
        <button
          onClick={toggleSidebar}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          title={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4 rotate-180" />
          )}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        {visibleItems.map((item: MenuItem) => (
          <NavItem key={item.group ?? item.path} item={item} collapsed={sidebarCollapsed} />
        ))}
      </nav>

      <div className="border-t border-border py-2">
        <div className={cn("px-3 text-[10px] text-muted-foreground", sidebarCollapsed && "text-center")}>
          {!sidebarCollapsed && <span>v2.0 · New Style</span>}
        </div>
      </div>
    </aside>
  );
}
