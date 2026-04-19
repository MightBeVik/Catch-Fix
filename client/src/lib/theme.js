export const THEME_OPTIONS = ["dark", "light"];
export const DEFAULT_THEME = "dark";
const STORAGE_KEY = "catch-fix-theme";

export function getStoredTheme() {
  const value = window.localStorage.getItem(STORAGE_KEY);
  return THEME_OPTIONS.includes(value) ? value : DEFAULT_THEME;
}

export function setStoredTheme(theme) {
  const resolvedTheme = THEME_OPTIONS.includes(theme) ? theme : DEFAULT_THEME;
  window.localStorage.setItem(STORAGE_KEY, resolvedTheme);
  return resolvedTheme;
}

export function applyTheme(theme) {
  const resolvedTheme = THEME_OPTIONS.includes(theme) ? theme : DEFAULT_THEME;
  document.documentElement.dataset.theme = resolvedTheme;
  return resolvedTheme;
}