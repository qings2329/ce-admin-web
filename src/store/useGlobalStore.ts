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

  // 防旁观模式（隐私打码）
  privacyMode: boolean;
  togglePrivacy: () => void;
  setPrivacy: (v: boolean) => void;

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

  privacyMode: false,
  togglePrivacy: () =>
    set((s) => {
      const next = !s.privacyMode;
      localStorage.setItem("cx_privacy_mode", next ? "1" : "0");
      return { privacyMode: next };
    }),
  setPrivacy: (v) => {
    localStorage.setItem("cx_privacy_mode", v ? "1" : "0");
    set({ privacyMode: v });
  },

  expandedGroups: { finance: true },
  toggleGroup: (group) =>
    set((s) => {
      const next = { ...s.expandedGroups, [group]: !s.expandedGroups[group] };
      localStorage.setItem("cx_sidebar_groups", JSON.stringify(next));
      return { expandedGroups: next };
    }),
}));

// 启动时从 localStorage 恢复侧边栏折叠状态
if (typeof window !== "undefined") {
  const saved = localStorage.getItem("cx_sidebar_collapsed");
  if (saved === "1") {
    useGlobalStore.setState({ sidebarCollapsed: true });
  }
  const savedPrivacy = localStorage.getItem("cx_privacy_mode");
  if (savedPrivacy === "1") {
    useGlobalStore.setState({ privacyMode: true });
  }
  // 恢复分组展开状态：如果没有保存过，默认展开所有分组
  const savedGroups = localStorage.getItem("cx_sidebar_groups");
  if (savedGroups) {
    try {
      const parsed = JSON.parse(savedGroups);
      // 合并：已保存的保留，未保存的默认展开
      useGlobalStore.setState({
        expandedGroups: { finance: true, users: true, trade: true, system: true, ...parsed },
      });
    } catch {}
  } else {
    // 首次访问：默认展开所有分组
    useGlobalStore.setState({ expandedGroups: { finance: true, users: true, trade: true, system: true } });
  }
}
