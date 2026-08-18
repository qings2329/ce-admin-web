// 轻量多主题：不引入第三方依赖。
// - 预设配色：dark / light / midnight / forest / solar，由 CSS [data-theme="..."] 变量块驱动。
// - system：跟随操作系统 prefers-color-scheme，在 light / dark 间自动切换，并监听系统变化实时生效。
// - 选择持久化到 localStorage（cx_admin_theme）；applyTheme 负责把逻辑主题解析为具体 data-theme 并写入 <html>。

export type ThemeId = "dark" | "light" | "midnight" | "forest" | "solar" | "system";

export const THEMES: { value: ThemeId; key: string }[] = [
  { value: "dark", key: "settings.theme.dark" },
  { value: "light", key: "settings.theme.light" },
  { value: "midnight", key: "settings.theme.midnight" },
  { value: "forest", key: "settings.theme.forest" },
  { value: "solar", key: "settings.theme.solar" },
  { value: "system", key: "settings.theme.system" },
];

export const THEME_STORAGE_KEY = "cx_admin_theme";

type Concrete = "dark" | "light" | "midnight" | "forest" | "solar";

const mq =
  typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-color-scheme: dark)")
    : null;

let sysListener: ((e: MediaQueryListEvent) => void) | null = null;

function resolve(theme: ThemeId): Concrete {
  if (theme === "system") return mq && mq.matches ? "dark" : "light";
  return theme;
}

// 应用主题：写入 <html data-theme>，并对 system 注册/清理系统配色监听。
export function applyTheme(theme: ThemeId) {
  if (sysListener && mq) {
    mq.removeEventListener("change", sysListener);
    sysListener = null;
  }
  document.documentElement.setAttribute("data-theme", resolve(theme));
  if (theme === "system" && mq) {
    sysListener = () => {
      document.documentElement.setAttribute("data-theme", resolve("system"));
    };
    mq.addEventListener("change", sysListener);
  }
}

// 启动时读取持久化主题；缺失则默认 dark。
export function initTheme(): ThemeId {
  const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  const theme: ThemeId =
    saved === "dark" ||
    saved === "light" ||
    saved === "midnight" ||
    saved === "forest" ||
    saved === "solar" ||
    saved === "system"
      ? saved
      : "dark";
  applyTheme(theme);
  return theme;
}
