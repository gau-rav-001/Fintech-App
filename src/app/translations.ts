export type LanguageCode = "en" | "hi" | "mr" | "kn";

export const languageOptions = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "mr", label: "मराठी" },
  { code: "kn", label: "ಕನ್ನಡ" },
] as const;

export const translations = {
  en: {
    navbar: {
      home: "Home",
      services: "Services",
      calculators: "Calculators",
      sipCalculator: "SIP Calculator",
      lumpsumCalculator: "Lumpsum Calculator",
      planner: "Planner",
      webinars: "Webinars",
      login: "Login",
      getStarted: "Get Started",
      language: "Language",
    },
  },
  hi: {
    navbar: {
      home: "होम",
      services: "सेवाएं",
      calculators: "कैलकुलेटर्स",
      sipCalculator: "एसआईपी कैलकुलेटर",
      lumpsumCalculator: "लंपसम कैलकुलेटर",
      planner: "प्लानर",
      webinars: "वेबिनार",
      login: "लॉगिन",
      getStarted: "शुरू करें",
      language: "भाषा",
    },
  },
  mr: {
    navbar: {
      home: "मुख्यपृष्ठ",
      services: "सेवा",
      calculators: "कॅल्क्युलेटर्स",
      sipCalculator: "एसआयपी कॅल्क्युलेटर",
      lumpsumCalculator: "लंपसम कॅल्क्युलेटर",
      planner: "प्लॅनर",
      webinars: "वेबिनार",
      login: "लॉगिन",
      getStarted: "सुरू करा",
      language: "भाषा",
    },
  },
  kn: {
    navbar: {
      home: "ಮುಖಪುಟ",
      services: "ಸೇವೆಗಳು",
      calculators: "ಕ್ಯಾಲ್ಕುಲೇಟರ್‌ಗಳು",
      sipCalculator: "ಎಸ್‌ಐಪಿ ಕ್ಯಾಲ್ಕುಲೇಟರ್",
      lumpsumCalculator: "ಲಂಪ್‌ಸಮ್ ಕ್ಯಾಲ್ಕುಲೇಟರ್",
      planner: "ಪ್ಲಾನರ್",
      webinars: "ವೆಬಿನಾರ್‌ಗಳು",
      login: "ಲಾಗಿನ್",
      getStarted: "ಪ್ರಾರಂಭಿಸಿ",
      language: "ಭಾಷೆ",
    },
  },
} as const;
