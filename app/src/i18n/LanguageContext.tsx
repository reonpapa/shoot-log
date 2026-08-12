import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Language = "ja" | "en";

const systemMessages: Record<string, string> = {
  "Supabaseは正常に応答しています。": "Supabase is responding normally.",
  "Supabaseへの接続を確認しています…": "Checking the Supabase connection…",
  "クラウドと同期済み": "Synced with cloud",
  "クラウドの最新データを確認中…": "Checking the latest cloud data…",
  "クラウドへ保存中…": "Saving to cloud…",
  "クラウド同期を利用するにはログインしてください。": "Sign in to use cloud sync.",
  "初回データを確認中…": "Checking initial data…",
};

// eslint-disable-next-line react-refresh/only-export-components
export function localizeSystemMessage(message: string, language: Language): string {
  return language === "en" ? systemMessages[message] ?? message : message;
}

interface LanguageContextValue {
  language: Language;
  locale: "ja-JP" | "en-US";
  setLanguage: (language: Language) => void;
  text: (japanese: string, english: string) => string;
}

const STORAGE_KEY = "shoot-log-language";
const defaultValue: LanguageContextValue = {
  language: "ja",
  locale: "ja-JP",
  setLanguage: () => undefined,
  text: (japanese) => japanese,
};
const LanguageContext = createContext<LanguageContextValue>(defaultValue);

function initialLanguage(): Language {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "ja" || stored === "en") return stored;
  return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);
  const value = useMemo<LanguageContextValue>(() => ({
    language,
    locale: language === "ja" ? "ja-JP" : "en-US",
    setLanguage: setLanguageState,
    text: (japanese, english) => language === "ja" ? japanese : english,
  }), [language]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

// Provider and hook intentionally live together so the language contract has one source of truth.
// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  return useContext(LanguageContext);
}
