import { createContext, useContext, useEffect, useMemo, useState } from "react";
import i18n from "../i18n/index.js";

const LanguageContext = createContext(null);
const supportedLanguages = ["en", "it", "es", "fr"];
const normalizeLanguage = (language) => supportedLanguages.includes(language) ? language : "en";

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => normalizeLanguage(localStorage.getItem("language") || "en"));

  const changeLanguage = (nextLanguage) => {
    const safeLanguage = normalizeLanguage(nextLanguage);
    localStorage.setItem("language", safeLanguage);
    setLanguage(safeLanguage);
    i18n.changeLanguage(safeLanguage);
  };

  useEffect(() => {
    if (i18n.language !== language) i18n.changeLanguage(language);
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(() => ({ language, changeLanguage }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
