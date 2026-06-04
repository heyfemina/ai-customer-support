import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import it from "./it.json";
import es from "./es.json";
import fr from "./fr.json";

const supportedLanguages = ["en", "it", "es", "fr"];
const savedLanguage = localStorage.getItem("language");
const initialLanguage = supportedLanguages.includes(savedLanguage) ? savedLanguage : "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    it: { translation: it },
    es: { translation: es },
    fr: { translation: fr },
  },
  lng: initialLanguage,
  fallbackLng: "en",
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

export default i18n;
