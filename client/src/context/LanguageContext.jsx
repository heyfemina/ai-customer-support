import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/axios.js";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../utils/constants.js";
import i18n from "../i18n/index.js";
import { normalizeStaticSource, translateStaticText } from "../i18n/staticText.js";

const LanguageContext = createContext(null);
const supportedLanguages = ["en", "it", "es", "fr"];
export const languageOptions = [
  { code: "en", label: "English" },
  { code: "it", label: "Italian" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
];
const normalizeLanguage = (language) => supportedLanguages.includes(language) ? language : "en";
const originalText = new WeakMap();
const translatedAttributes = ["placeholder", "title", "aria-label"];
const ignoredTags = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE"]);

function isDynamicValueText(value = "") {
  const text = value.trim();
  return text === "N/A" || /^[\d\s.,:%/+/-]+[a-zA-Z]*$/.test(text);
}

function translateNodeTree(root, language) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || ignoredTags.has(parent.tagName)) return NodeFilter.FILTER_REJECT;
      if (parent.closest("[data-dynamic-text], [data-no-translate]")) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue?.trim()) return NodeFilter.FILTER_REJECT;
      if (isDynamicValueText(node.nodeValue)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    if (!originalText.has(node)) originalText.set(node, node.nodeValue.replace(node.nodeValue.trim(), normalizeStaticSource(node.nodeValue)));
    const source = originalText.get(node);
    node.nodeValue = language === "en" ? source : source.replace(source.trim(), translateStaticText(source, language));
  });

  const elements = root.querySelectorAll?.("*") || [];
  elements.forEach((element) => {
    if (ignoredTags.has(element.tagName)) return;
    translatedAttributes.forEach((attribute) => {
      if (!element.hasAttribute(attribute)) return;
      const originalName = `data-i18n-original-${attribute}`;
      if (!element.hasAttribute(originalName)) element.setAttribute(originalName, normalizeStaticSource(element.getAttribute(attribute)));
      const source = element.getAttribute(originalName);
      element.setAttribute(attribute, language === "en" ? source : translateStaticText(source, language));
    });
  });
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => normalizeLanguage(localStorage.getItem("language") || "en"));

  const persistUserLanguage = (safeLanguage) => {
    try {
      const storedUser = JSON.parse(sessionStorage.getItem(AUTH_USER_KEY) || "null");
      if (storedUser) sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify({ ...storedUser, language: safeLanguage }));
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
    if (syncProfile && sessionStorage.getItem(AUTH_TOKEN_KEY)) {
      api.put("/auth/profile", { language: safeLanguage }).catch(() => {});
    }
  };

  useEffect(() => {
    if (i18n.language !== language) i18n.changeLanguage(language);
    document.documentElement.lang = language;
    window.requestAnimationFrame(() => translateNodeTree(document.body, language));
  }, [language]);

  useEffect(() => {
    let pending = false;
    const observer = new MutationObserver(() => {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(() => {
        pending = false;
        translateNodeTree(document.body, language);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: translatedAttributes });
    translateNodeTree(document.body, language);
    return () => observer.disconnect();
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
