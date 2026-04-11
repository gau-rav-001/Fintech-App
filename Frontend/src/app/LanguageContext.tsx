import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  languageOptions,
  translations,
  type LanguageCode,
} from "./translations";

type LanguageContextValue = {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (typeof translations)[LanguageCode];
  languageOptions: typeof languageOptions;
};

const LanguageContext = createContext<LanguageContextValue | null>(
  null,
);

export function LanguageProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [language, setLanguage] =
    useState<LanguageCode>("en");

  useEffect(() => {
    const savedLanguage =
      typeof window !== "undefined"
        ? window.localStorage.getItem("site-language")
        : null;

    if (
      savedLanguage === "en" ||
      savedLanguage === "hi" ||
      savedLanguage === "mr" ||
      savedLanguage === "kn"
    ) {
      setLanguage(savedLanguage);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("site-language", language);
    }
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: translations[language],
      languageOptions,
    }),
    [language],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used inside LanguageProvider",
    );
  }

  return context;
}
