import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import i18n from "../i18n/index.js";

const LanguageContext = createContext(null);
const supportedLanguages = ["en", "it", "es", "fr"];
export const languageOptions = [
  { code: "en", label: "English" },
  { code: "it", label: "Italian" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
];
const normalizeLanguage = (language) => supportedLanguages.includes(language) ? language : "en";

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => normalizeLanguage(localStorage.getItem("language") || "en"));

  const persistUserLanguage = (safeLanguage) => {
    try {
      const storedUser = JSON.parse(localStorage.getItem("user") || "null");
      if (storedUser) localStorage.setItem("user", JSON.stringify({ ...storedUser, language: safeLanguage }));
    } catch {
      // Local UI language should continue even if stored user data is malformed.
    }
  };

  const changeLanguage = (nextLanguage, { syncProfile = true } = {}) => {
    const safeLanguage = normalizeLanguage(nextLanguage);
    localStorage.setItem("language", safeLanguage);
    persistUserLanguage(safeLanguage);
    setLanguage(safeLanguage);
    i18n.changeLanguage(safeLanguage);
    if (syncProfile && localStorage.getItem("token")) {
      api.put("/auth/profile", { language: safeLanguage }).catch(() => {});
    }
  };

  useEffect(() => {
    if (i18n.language !== language) i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    const applyProfileLanguage = (event) => {
      const savedLanguage = localStorage.getItem("language");
      if (savedLanguage) return;
      const profileLanguage = normalizeLanguage(event.detail?.language);
      changeLanguage(profileLanguage, { syncProfile: false });
    };

    window.addEventListener("auth:profile", applyProfileLanguage);
    return () => window.removeEventListener("auth:profile", applyProfileLanguage);
  }, []);

  const value = useMemo(() => ({ language, changeLanguage }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
