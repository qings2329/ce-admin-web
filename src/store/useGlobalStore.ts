import { create } from "zustand";

// ─── 全局 Store ───────────────────────────────────────────────────────────────
interface GlobalState {
  // 侧边栏
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (v: boolean) => void;

  // 顶部搜索弹窗
  searchOpen: boolean;
  searchQuery: string;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (q: string) => void;

  // 通知中心
  notifOpen: boolean;
  toggleNotif: () => void;
  closeNotif: () => void;

  // 菜单展开状态（分组）
  expandedGroups: Record<string, boolean>;
  toggleGroup: (group: string) => void;
}

export const useGlobalStore = create<GlobalState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((s) => {
      const next = !s.sidebarCollapsed;
      localStorage.setItem("cx_sidebar_collapsed", next ? "1" : "0");
      return { sidebarCollapsed: next };
    }),
  setSidebarCollapsed: (v) => {
    localStorage.setItem("cx_sidebar_collapsed", v ? "1" : "0");
    set({ sidebarCollapsed: v });
  },

  searchOpen: false,
  searchQuery: "",
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false, searchQuery: "" }),
  setSearchQuery: (q) => set({ searchQuery: q }),

  notifOpen: false,
  toggleNotif: () => set((s) => ({ notifOpen: !s.notifOpen })),
  closeNotif: () => set({ notifOpen: false }),

  expandedGroups: {},
  toggleGroup: (group) =>
    set((s) => ({
      expandedGroups: { ...s.expandedGroups, [group]: !s.expandedGroups[group] },
    })),
}));

// 启动时从 localStorage 恢复侧边栏折叠状态
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("cx_sidebar_collapsed");
  if (saved === "1") {
    useGlobalStore.setState({ sidebarCollapsed: true });
  }
}
