import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { translationsMap, type SupportedLanguage, enTranslations } from "@/locales";

export type Language = SupportedLanguage;

export interface AppLanguageInfo {
  code: Language;
  name: string;        // Native name
  englishName: string; // English name
  flag: string;        // Flag emoji
}

export const SUPPORTED_LANGUAGES: AppLanguageInfo[] = [
  { code: "en", name: "English", englishName: "English", flag: "🇬🇧" },
  { code: "vi", name: "Tiếng Việt", englishName: "Vietnamese", flag: "🇻🇳" },
  { code: "es", name: "Español", englishName: "Spanish", flag: "🇪🇸" },
  { code: "fr", name: "Français", englishName: "French", flag: "🇫🇷" },
  { code: "de", name: "Deutsch", englishName: "German", flag: "🇩🇪" },
  { code: "pt-BR", name: "Português (Brasil)", englishName: "Brazilian Portuguese", flag: "🇧🇷" },
  { code: "id", name: "Bahasa Indonesia", englishName: "Indonesian", flag: "🇮🇩" },
];

export interface FormatOptions {
  currency?: string;
  decimals?: number;
}

export interface LanguageContextType {
  language: Language;
  canChangeLanguage: boolean;
  setLanguage: (lang: Language) => void;
  isVietnamese: boolean;
  t: (key: string, paramsOrFallback?: Record<string, string | number> | string, fallback?: string) => string;
  formatCurrency: (amount: number, currency?: string) => string;
  formatNumber: (value: number, decimals?: number) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: React.ReactNode;
  defaultLanguage?: Language;
  fixedLanguage?: Language;
}

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return key in params ? String(params[key]) : `{${key}}`;
  });
}

function resolveLocaleTag(lang: Language): string {
  switch (lang) {
    case "vi": return "vi-VN";
    case "es": return "es-ES";
    case "fr": return "fr-FR";
    case "de": return "de-DE";
    case "pt-BR": return "pt-BR";
    case "id": return "id-ID";
    case "en":
    default:
      return "en-US";
  }
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children, defaultLanguage, fixedLanguage }) => {
  const [preferredLanguage, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem("tenvora_lang") as Language | null;
      if (saved && saved in translationsMap) return saved;
      if (defaultLanguage && defaultLanguage in translationsMap) return defaultLanguage;
      return "en";
    } catch {
      return defaultLanguage || "en";
    }
  });

  const language: Language = fixedLanguage ?? preferredLanguage;

  const setLanguage = useCallback((lang: Language) => {
    if (fixedLanguage) return;
    if (!(lang in translationsMap)) return;
    setLanguageState(lang);
    try {
      localStorage.setItem("tenvora_lang", lang);
    } catch {
      // ignore
    }
  }, [fixedLanguage]);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback((
    key: string,
    paramsOrFallback?: Record<string, string | number> | string,
    fallback?: string
  ): string => {
    let params: Record<string, string | number> | undefined;
    let explicitFallback: string | undefined = fallback;

    if (typeof paramsOrFallback === "string") {
      explicitFallback = paramsOrFallback;
    } else if (typeof paramsOrFallback === "object" && paramsOrFallback !== null) {
      params = paramsOrFallback;
    }

    const dict = translationsMap[language] || translationsMap.en;
    if (key in dict) {
      return interpolate(dict[key], params);
    }

    // Fallback to canonical English dictionary
    if (language !== "en" && key in translationsMap.en) {
      return interpolate(translationsMap.en[key], params);
    }

    const raw = explicitFallback ?? key;
    return interpolate(raw, params);
  }, [language]);

  const formatCurrency = useCallback((amount: number, currency = "VND"): string => {
    const localeTag = resolveLocaleTag(language);
    try {
      if (currency === "VND") {
        return `${Math.round(amount).toLocaleString(localeTag)} ₫`;
      }
      return new Intl.NumberFormat(localeTag, {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toLocaleString(localeTag)} ${currency}`;
    }
  }, [language]);

  const formatNumber = useCallback((value: number, decimals?: number): string => {
    const localeTag = resolveLocaleTag(language);
    return new Intl.NumberFormat(localeTag, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  }, [language]);

  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const localeTag = resolveLocaleTag(language);
    const d = typeof date === "string" ? new Date(date) : date;
    const defaultOptions: Intl.DateTimeFormatOptions = options ?? {
      year: "numeric",
      month: "short",
      day: "numeric",
    };
    return new Intl.DateTimeFormat(localeTag, defaultOptions).format(d);
  }, [language]);

  const isVietnamese = language === "vi";

  const value = useMemo(
    () => ({
      language,
      canChangeLanguage: !fixedLanguage,
      setLanguage,
      isVietnamese,
      t,
      formatCurrency,
      formatNumber,
      formatDate,
    }),
    [language, isVietnamese, t, setLanguage, fixedLanguage, formatCurrency, formatNumber, formatDate]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

const defaultLanguageContext: LanguageContextType = {
  language: "en",
  canChangeLanguage: true,
  setLanguage: () => {},
  isVietnamese: false,
  t: (key: string, paramsOrFallback?: Record<string, string | number> | string, fallback?: string) => {
    const explicitFallback = typeof paramsOrFallback === "string" ? paramsOrFallback : fallback;
    const params = typeof paramsOrFallback === "object" && paramsOrFallback !== null ? paramsOrFallback : undefined;
    const raw = enTranslations[key] ?? explicitFallback ?? key;
    return interpolate(raw, params);
  },
  formatCurrency: (amount: number, currency = "VND") => `${amount.toLocaleString("en-US")} ${currency}`,
  formatNumber: (value: number) => value.toLocaleString("en-US"),
  formatDate: (date: Date | string) => new Date(date).toLocaleDateString("en-US"),
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  return context ?? defaultLanguageContext;
};
