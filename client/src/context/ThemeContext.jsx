import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { defaultThemeId, getTheme, themes } from "../theme/themes.js";

const ThemeContext = createContext(null);
const THEME_KEY = "appTheme";

function applyTheme(themeId) {
  const theme = getTheme(themeId);
  const root = document.documentElement;
  root.dataset.theme = themeId;
  root.style.setProperty("--primary", theme.primary);
  root.style.setProperty("--primary-light", theme.primary);
  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--surface", theme.surface);
  root.style.setProperty("--surface-alt", theme.surfaceAlt);
  root.style.setProperty("--border", theme.border);
  root.style.setProperty("--text-main", theme.text);
  root.style.setProperty("--text-muted", theme.muted);
  root.style.setProperty("--primary-soft", theme.primarySoft);
  root.style.setProperty("--sidebar-bg", theme.sidebar);
  root.style.setProperty("--topbar-bg", theme.topbar);
  root.style.colorScheme = themeId === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(() => localStorage.getItem(THEME_KEY) || defaultThemeId);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, themeId);
    applyTheme(themeId);
  }, [themeId]);

  const value = useMemo(() => ({ themeId, setThemeId, themes }), [themeId]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
