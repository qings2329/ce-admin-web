// 轻量多主题：仅 Dark / Light / System，由 <html class="dark"> 驱动 Tailwind darkMode:"class"。
// 选择持久化到 localStorage（cx_admin_theme）；applyTheme 解析逻辑主题为具体明暗并写入 class。

export type ThemeId = "dark" | "light" | "system";

export const THEMES: { value: ThemeId; key: string }[] = [
  { value: "dark", key: "settings.theme.dark" },
  { value: "light", key: "settings.theme.light" },
  { value: "system", key: "settings.theme.system" },
];

export const THEME_STORAGE_KEY = "cx_admin_theme";

type Concrete = "dark" | "light";

const mq =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

let sysListener: ((e: MediaQueryListEvent) => void) | null = null;

function resolve(theme: ThemeId): Concrete {
  if (theme === "system") return mq && mq.matches ? "dark" : "light";
  return theme;
}

// 应用主题：在 <html> 上切换 .dark class。
export function applyTheme(theme: ThemeId) {
  if (sysListener && mq) {
    mq.removeEventListener("change", sysListener);
    sysListener = null;
  }
  const dark = resolve(theme) === "dark";
  document.documentElement.classList.toggle("dark", dark);
  if (theme === "system" && mq) {
    sysListener = () =>
      document.documentElement.classList.toggle("dark", resolve("system") === "dark");
    mq.addEventListener("change", sysListener);
  }
}

// 启动时读取持久化主题；缺失则默认 dark（高对比暗黑）。
export function initTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  const theme: ThemeId =
    saved === "dark" || saved === "light" || saved === "system" ? saved : "dark";
  applyTheme(theme);
  return theme;
}
