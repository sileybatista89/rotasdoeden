import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { SUPPORTED_LANGUAGES, translations, type LangCode } from "./translations";

interface Ctx {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
}

const LanguageCtx = createContext<Ctx>({ lang: "pt", setLang: () => {}, t: (k) => k });

const STORAGE_KEY = "rotas-eden-lang";

function detect(): LangCode {
  if (typeof window === "undefined") return "pt";
  const saved = window.localStorage.getItem(STORAGE_KEY) as LangCode | null;
  if (saved && translations[saved]) return saved;
  const nav = window.navigator?.language?.toLowerCase() ?? "pt";
  const base = nav.split("-")[0];
  const match = SUPPORTED_LANGUAGES.find((l) => l.code === base);
  return (match?.code as LangCode) ?? "pt";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("pt");

  useEffect(() => {
    setLangState(detect());
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = lang;
  }, [lang]);

  const setLang = (l: LangCode) => {
    setLangState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* no-op */
    }
  };

  const value = useMemo<Ctx>(
    () => ({
      lang,
      setLang,
      t: (key) => translations[lang]?.[key] ?? translations.pt[key] ?? key,
    }),
    [lang]
  );

  return <LanguageCtx.Provider value={value}>{children}</LanguageCtx.Provider>;
}

export const useT = () => useContext(LanguageCtx);
