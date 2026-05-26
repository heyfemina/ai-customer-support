import { createContext, useContext, useEffect, useMemo, useState } from "react";
import i18n from "../i18n/index.js";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem("language") || "en");

  const changeLanguage = (nextLanguage) => {
    localStorage.setItem("language", nextLanguage);
    setLanguage(nextLanguage);
    i18n.changeLanguage(nextLanguage);
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
