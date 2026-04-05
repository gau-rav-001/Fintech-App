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
    home: {
  heroBadge: "Smart Wealth Planning Platform",
  heroTitleStart: "Smart Financial Planning for a",
  heroTitleHighlight: "Stronger Future",
  heroDescription:
    "Track your goals, plan your investments, explore calculators, and grow wealth with expert-backed strategies in one premium finance experience.",
  heroPrimaryCta: "Start Your Journey",
  heroSecondaryCta: "Try Calculator",
  statUsers: "Active Users",
  statAssets: "Assets Planned",
  statSatisfaction: "User Satisfaction",
  portfolioValue: "Portfolio Value",
  wealthOverview: "Wealth Overview",
  stableGrowth: "Stable Growth",
  stableGrowthDesc:
    "Smart allocation across SIPs, insurance, and long-term financial goals.",
  monthlySip: "Monthly SIP",
  yearlyGrowth: "Yearly Growth",
  retirementGoal: "Retirement Goal",
  emergencyFund: "Emergency Fund",
  secureGuided: "Secure & Guided",

  servicesBadge: "Premium Financial Services",
  servicesTitle: "Our Services",
  servicesDescription:
    "Comprehensive financial solutions tailored to help you grow, protect, and manage your wealth with confidence.",
  serviceInvestmentPlanning: "Investment Planning",
  serviceInvestmentPlanningDesc:
    "Strategic investment plans designed to meet your financial goals with optimal returns.",
  serviceRiskManagement: "Risk Management",
  serviceRiskManagementDesc:
    "Protect your wealth with comprehensive risk assessment and management strategies.",
  servicePortfolioManagement: "Portfolio Management",
  servicePortfolioManagementDesc:
    "Diversified portfolio solutions to maximize returns while minimizing risks.",
  serviceWealthGrowth: "Wealth Growth",
  serviceWealthGrowthDesc:
    "Accelerate your wealth creation with proven investment strategies and insights.",
  serviceTaxPlanning: "Tax Planning",
  serviceTaxPlanningDesc:
    "Smart tax-saving strategies to optimize your investments and maximize savings.",
  serviceExpertGuidance: "Expert Guidance",
  serviceExpertGuidanceDesc:
    "Personalized consultation from certified financial advisors and experts.",
  
  serviceInsurancePlanning: "Insurance Planning",
serviceInsurancePlanningDesc:
  "Protect your financial future with smart insurance strategies including life, health, and asset coverage tailored to your needs.",

  calculatorsBadge: "Smart Investment Tools",
  calculatorsTitle: "Financial Calculators",
  calculatorsDescription:
    "Explore premium calculators to estimate returns and make smarter investment decisions with confidence.",
  sipCalculator: "SIP Calculator",
  sipCalculatorDesc:
    "Calculate potential returns from systematic investment plans",
  lumpsumCalculator: "Lumpsum Calculator",
  lumpsumCalculatorDesc:
    "Estimate returns on one-time investment amounts",
  tryNow: "Try Now",

  planningBadge: "Personalized Wealth Planning",
  planningTitle: "Personalized Financial Planning",
  planningDescription:
    "Get a customized financial plan based on your goals, risk appetite, and investment horizon.",
  planningFeature1: "Goal-based investment strategies",
  planningFeature2: "Risk assessment and portfolio allocation",
  planningFeature3: "Monthly investment recommendations",
  planningFeature4: "Downloadable financial reports",
  startPlanning: "Start Planning",
  whatYoullGet: "What You'll Get",
  planningBenefit1: "Comprehensive financial analysis",
  planningBenefit2: "Asset allocation recommendations",
  planningBenefit3: "Monthly SIP suggestions",
  planningBenefit4: "Goal tracking dashboard",

  webinarsTitle: "Upcoming Webinars",
  webinarsDescription: "Learn from financial experts",
  webinar1Title: "Building Wealth in Your 30s",
  webinar2Title: "Tax-Saving Strategies 2026",
  webinar3Title: "Mutual Funds Masterclass",
  webinar1Date: "March 28, 2026",
  webinar2Date: "March 30, 2026",
  webinar3Date: "April 2, 2026",
  webinarSpeakerBy: "By",
  webinarSpeaker1: "Rajesh Kumar",
  webinarSpeaker2: "Priya Sharma",
  webinarSpeaker3: "Amit Patel",
  viewAllWebinars: "View All Webinars",

  whatsappTitle: "Get Expert Advice on WhatsApp",
  whatsappDescription:
    "Chat with our financial advisors and get personalized recommendations instantly.",
  whatsappCta: "Start WhatsApp Chat",
},
    footer: {
  description:
    "Your trusted partner for smart financial planning and investment solutions.",
  quickLinks: "Quick Links",
  calculators: "Calculators",
  contact: "Contact Us",
  home: "Home",
  services: "Services",
  planner: "Financial Planner",
  webinars: "Webinars",
  sip: "SIP Calculator",
  lumpsum: "Lumpsum Calculator",
  copyright: "© 2026 SmartFinance. All rights reserved.",
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
    home: {
  heroBadge: "स्मार्ट वेल्थ प्लानिंग प्लेटफॉर्म",
  heroTitleStart: "मजबूत भविष्य के लिए",
  heroTitleHighlight: "स्मार्ट वित्तीय योजना",
  heroDescription:
    "अपने लक्ष्यों को ट्रैक करें, निवेश की योजना बनाएं, कैलकुलेटर देखें, और विशेषज्ञ-समर्थित रणनीतियों के साथ अपनी संपत्ति बढ़ाएं।",
  heroPrimaryCta: "अपनी यात्रा शुरू करें",
  heroSecondaryCta: "कैलकुलेटर देखें",
  statUsers: "सक्रिय उपयोगकर्ता",
  statAssets: "नियोजित संपत्ति",
  statSatisfaction: "उपयोगकर्ता संतुष्टि",
  portfolioValue: "पोर्टफोलियो मूल्य",
  wealthOverview: "वेल्थ ओवरव्यू",
  stableGrowth: "स्थिर वृद्धि",
  stableGrowthDesc:
    "SIP, बीमा और दीर्घकालिक वित्तीय लक्ष्यों में स्मार्ट आवंटन।",
  monthlySip: "मासिक SIP",
  yearlyGrowth: "वार्षिक वृद्धि",
  retirementGoal: "सेवानिवृत्ति लक्ष्य",
  emergencyFund: "इमरजेंसी फंड",
  secureGuided: "सुरक्षित और मार्गदर्शित",

  servicesBadge: "प्रीमियम वित्तीय सेवाएं",
  servicesTitle: "हमारी सेवाएं",
  servicesDescription:
    "आपकी संपत्ति को बढ़ाने, सुरक्षित रखने और आत्मविश्वास के साथ प्रबंधित करने के लिए व्यापक वित्तीय समाधान।",
  serviceInvestmentPlanning: "निवेश योजना",
  serviceInvestmentPlanningDesc:
    "आपके वित्तीय लक्ष्यों के लिए रणनीतिक निवेश योजनाएं।",
  serviceRiskManagement: "जोखिम प्रबंधन",
  serviceRiskManagementDesc:
    "व्यापक जोखिम मूल्यांकन और प्रबंधन रणनीतियों से अपनी संपत्ति सुरक्षित रखें।",
  servicePortfolioManagement: "पोर्टफोलियो प्रबंधन",
  servicePortfolioManagementDesc:
    "रिटर्न बढ़ाने और जोखिम घटाने के लिए विविध पोर्टफोलियो समाधान।",
  serviceWealthGrowth: "संपत्ति वृद्धि",
  serviceWealthGrowthDesc:
    "सिद्ध निवेश रणनीतियों के साथ अपनी संपत्ति तेजी से बढ़ाएं।",
  serviceTaxPlanning: "कर योजना",
  serviceTaxPlanningDesc:
    "स्मार्ट टैक्स-बचत रणनीतियों से निवेश और बचत को बेहतर बनाएं।",
  serviceExpertGuidance: "विशेषज्ञ मार्गदर्शन",
  serviceExpertGuidanceDesc:
    "प्रमाणित वित्तीय सलाहकारों से व्यक्तिगत परामर्श।",

  serviceInsurancePlanning: "बीमा योजना",
serviceInsurancePlanningDesc:
  "जीवन, स्वास्थ्य और संपत्ति बीमा के साथ अपने वित्तीय भविष्य को सुरक्षित करें।",

  calculatorsBadge: "स्मार्ट निवेश टूल्स",
  calculatorsTitle: "वित्तीय कैलकुलेटर",
  calculatorsDescription:
    "रिटर्न का अनुमान लगाने और बेहतर निवेश निर्णय लेने के लिए प्रीमियम कैलकुलेटर देखें।",
  sipCalculator: "एसआईपी कैलकुलेटर",
  sipCalculatorDesc:
    "सिस्टेमैटिक निवेश योजनाओं के संभावित रिटर्न की गणना करें",
  lumpsumCalculator: "लंपसम कैलकुलेटर",
  lumpsumCalculatorDesc:
    "एकमुश्त निवेश राशि पर संभावित रिटर्न का अनुमान लगाएं",
  tryNow: "अभी आज़माएं",

  planningBadge: "व्यक्तिगत वेल्थ प्लानिंग",
  planningTitle: "व्यक्तिगत वित्तीय योजना",
  planningDescription:
    "अपने लक्ष्यों, जोखिम क्षमता और निवेश अवधि के आधार पर अनुकूलित वित्तीय योजना प्राप्त करें।",
  planningFeature1: "लक्ष्य-आधारित निवेश रणनीतियां",
  planningFeature2: "जोखिम मूल्यांकन और पोर्टफोलियो आवंटन",
  planningFeature3: "मासिक निवेश सुझाव",
  planningFeature4: "डाउनलोड करने योग्य वित्तीय रिपोर्ट",
  startPlanning: "योजना शुरू करें",
  whatYoullGet: "आपको क्या मिलेगा",
  planningBenefit1: "व्यापक वित्तीय विश्लेषण",
  planningBenefit2: "एसेट एलोकेशन सुझाव",
  planningBenefit3: "मासिक SIP सुझाव",
  planningBenefit4: "गोल ट्रैकिंग डैशबोर्ड",

  webinarsTitle: "आगामी वेबिनार",
  webinarsDescription: "वित्तीय विशेषज्ञों से सीखें",
  webinar1Title: "अपने 30s में संपत्ति बनाना",
  webinar2Title: "टैक्स-बचत रणनीतियां 2026",
  webinar3Title: "म्यूचुअल फंड्स मास्टरक्लास",
  webinar1Date: "28 मार्च, 2026",
  webinar2Date: "30 मार्च, 2026",
  webinar3Date: "2 अप्रैल, 2026",
  webinarSpeakerBy: "द्वारा",
  webinarSpeaker1: "राजेश कुमार",
  webinarSpeaker2: "प्रिया शर्मा",
  webinarSpeaker3: "अमित पटेल",
  viewAllWebinars: "सभी वेबिनार देखें",

  whatsappTitle: "व्हाट्सऐप पर विशेषज्ञ सलाह लें",
  whatsappDescription:
    "हमारे वित्तीय सलाहकारों से चैट करें और तुरंत व्यक्तिगत सुझाव पाएं।",
  whatsappCta: "व्हाट्सऐप चैट शुरू करें",
},
    footer: {
  description:
    "स्मार्ट वित्तीय योजना और निवेश समाधान के लिए आपका विश्वसनीय साथी।",
  quickLinks: "त्वरित लिंक",
  calculators: "कैलकुलेटर्स",
  contact: "संपर्क करें",
  home: "होम",
  services: "सेवाएं",
  planner: "फाइनेंशियल प्लानर",
  webinars: "वेबिनार",
  sip: "एसआईपी कैलकुलेटर",
  lumpsum: "लंपसम कैलकुलेटर",
  copyright: "© 2026 SmartFinance. सर्वाधिकार सुरक्षित।",
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
    home: {
  heroBadge: "स्मार्ट वेल्थ प्लॅनिंग प्लॅटफॉर्म",
  heroTitleStart: "मजबूत भविष्यासाठी",
  heroTitleHighlight: "स्मार्ट आर्थिक नियोजन",
  heroDescription:
    "तुमचे ध्येय ट्रॅक करा, गुंतवणुकीची योजना करा, कॅल्क्युलेटर पाहा आणि तज्ज्ञांच्या मदतीने संपत्ती वाढवा.",
  heroPrimaryCta: "तुमची सुरुवात करा",
  heroSecondaryCta: "कॅल्क्युलेटर वापरा",
  statUsers: "सक्रिय वापरकर्ते",
  statAssets: "नियोजित मालमत्ता",
  statSatisfaction: "वापरकर्ता समाधान",
  portfolioValue: "पोर्टफोलिओ मूल्य",
  wealthOverview: "वेल्थ ओव्हरव्ह्यू",
  stableGrowth: "स्थिर वाढ",
  stableGrowthDesc:
    "SIP, विमा आणि दीर्घकालीन आर्थिक ध्येयांमध्ये स्मार्ट वाटप.",
  monthlySip: "मासिक SIP",
  yearlyGrowth: "वार्षिक वाढ",
  retirementGoal: "निवृत्ती ध्येय",
  emergencyFund: "आपत्कालीन निधी",
  secureGuided: "सुरक्षित आणि मार्गदर्शित",

  servicesBadge: "प्रीमियम आर्थिक सेवा",
  servicesTitle: "आमच्या सेवा",
  servicesDescription:
    "तुमची संपत्ती वाढवण्यासाठी, सुरक्षित ठेवण्यासाठी आणि आत्मविश्वासाने व्यवस्थापित करण्यासाठी संपूर्ण आर्थिक उपाय.",
  serviceInvestmentPlanning: "गुंतवणूक नियोजन",
  serviceInvestmentPlanningDesc:
    "तुमच्या आर्थिक ध्येयांसाठी रणनीतिक गुंतवणूक योजना.",
  serviceRiskManagement: "जोखीम व्यवस्थापन",
  serviceRiskManagementDesc:
    "संपत्ती सुरक्षित ठेवण्यासाठी व्यापक जोखीम विश्लेषण आणि व्यवस्थापन.",
  servicePortfolioManagement: "पोर्टफोलिओ व्यवस्थापन",
  servicePortfolioManagementDesc:
    "परतावा वाढवण्यासाठी आणि जोखीम कमी करण्यासाठी विविध पोर्टफोलिओ उपाय.",
  serviceWealthGrowth: "संपत्ती वाढ",
  serviceWealthGrowthDesc:
    "सिद्ध गुंतवणूक रणनीतींनी संपत्ती निर्मिती वेगवान करा.",
  serviceTaxPlanning: "कर नियोजन",
  serviceTaxPlanningDesc:
    "स्मार्ट कर-बचत रणनीतींनी गुंतवणूक आणि बचत सुधारित करा.",
  serviceExpertGuidance: "तज्ज्ञ मार्गदर्शन",
  serviceExpertGuidanceDesc:
    "प्रमाणित आर्थिक सल्लागारांकडून वैयक्तिक सल्ला.",
  serviceInsurancePlanning: "विमा नियोजन",
serviceInsurancePlanningDesc:
  "जीवन, आरोग्य आणि मालमत्ता विम्यासह तुमचे आर्थिक भविष्य सुरक्षित करा.",

  calculatorsBadge: "स्मार्ट गुंतवणूक साधने",
  calculatorsTitle: "आर्थिक कॅल्क्युलेटर्स",
  calculatorsDescription:
    "परतावा अंदाजण्यासाठी आणि चांगले गुंतवणूक निर्णय घेण्यासाठी प्रीमियम कॅल्क्युलेटर्स वापरा.",
  sipCalculator: "एसआयपी कॅल्क्युलेटर",
  sipCalculatorDesc:
    "सिस्टेमॅटिक गुंतवणूक योजनांवरील संभाव्य परतावा मोजा",
  lumpsumCalculator: "लंपसम कॅल्क्युलेटर",
  lumpsumCalculatorDesc:
    "एकरकमी गुंतवणुकीवरील संभाव्य परतावा मोजा",
  tryNow: "आत्ताच वापरा",

  planningBadge: "वैयक्तिक वेल्थ प्लॅनिंग",
  planningTitle: "वैयक्तिक आर्थिक नियोजन",
  planningDescription:
    "तुमचे ध्येय, जोखीम क्षमता आणि गुंतवणूक कालावधी यावर आधारित सानुकूल आर्थिक योजना मिळवा.",
  planningFeature1: "ध्येयाधारित गुंतवणूक रणनीती",
  planningFeature2: "जोखीम मूल्यांकन आणि पोर्टफोलिओ वाटप",
  planningFeature3: "मासिक गुंतवणूक शिफारसी",
  planningFeature4: "डाउनलोड करण्यायोग्य आर्थिक अहवाल",
  startPlanning: "नियोजन सुरू करा",
  whatYoullGet: "तुम्हाला काय मिळेल",
  planningBenefit1: "संपूर्ण आर्थिक विश्लेषण",
  planningBenefit2: "मालमत्ता वाटप शिफारसी",
  planningBenefit3: "मासिक SIP सूचना",
  planningBenefit4: "ध्येय ट्रॅकिंग डॅशबोर्ड",

  webinarsTitle: "आगामी वेबिनार",
  webinarsDescription: "आर्थिक तज्ज्ञांकडून शिका",
  webinar1Title: "तुमच्या 30s मध्ये संपत्ती निर्माण",
  webinar2Title: "कर-बचत रणनीती 2026",
  webinar3Title: "म्युच्युअल फंड्स मास्टरक्लास",
  webinar1Date: "28 मार्च 2026",
  webinar2Date: "30 मार्च 2026",
  webinar3Date: "2 एप्रिल 2026",
  webinarSpeakerBy: "कडून",
  webinarSpeaker1: "राजेश कुमार",
  webinarSpeaker2: "प्रिया शर्मा",
  webinarSpeaker3: "अमित पटेल",
  viewAllWebinars: "सर्व वेबिनार पाहा",

  whatsappTitle: "व्हॉट्सअॅपवर तज्ज्ञ सल्ला मिळवा",
  whatsappDescription:
    "आमच्या आर्थिक सल्लागारांशी चॅट करा आणि त्वरित वैयक्तिक शिफारसी मिळवा.",
  whatsappCta: "व्हॉट्सअॅप चॅट सुरू करा",
},
    footer: {
  description:
    "स्मार्ट आर्थिक नियोजन आणि गुंतवणूक उपायांसाठी तुमचा विश्वासू भागीदार.",
  quickLinks: "जलद दुवे",
  calculators: "कॅल्क्युलेटर्स",
  contact: "संपर्क करा",
  home: "मुख्यपृष्ठ",
  services: "सेवा",
  planner: "आर्थिक नियोजक",
  webinars: "वेबिनार",
  sip: "एसआयपी कॅल्क्युलेटर",
  lumpsum: "लंपसम कॅल्क्युलेटर",
  copyright: "© 2026 SmartFinance. सर्व हक्क राखीव.",
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
    home: {
  heroBadge: "ಸ್ಮಾರ್ಟ್ ವೆಲ್ತ್ ಪ್ಲಾನಿಂಗ್ ವೇದಿಕೆ",
  heroTitleStart: "ಬಲವಾದ ಭವಿಷ್ಯಕ್ಕಾಗಿ",
  heroTitleHighlight: "ಸ್ಮಾರ್ಟ್ ಹಣಕಾಸು ಯೋಜನೆ",
  heroDescription:
    "ನಿಮ್ಮ ಗುರಿಗಳನ್ನು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ, ಹೂಡಿಕೆಗಳನ್ನು ಯೋಜಿಸಿ, ಕ್ಯಾಲ್ಕುಲೇಟರ್‌ಗಳನ್ನು ಬಳಸಿ ಮತ್ತು ತಜ್ಞರ ನೆರವಿನಿಂದ ಸಂಪತ್ತು ಹೆಚ್ಚಿಸಿ.",
  heroPrimaryCta: "ನಿಮ್ಮ ಪ್ರಯಾಣ ಪ್ರಾರಂಭಿಸಿ",
  heroSecondaryCta: "ಕ್ಯಾಲ್ಕುಲೇಟರ್ ಪ್ರಯತ್ನಿಸಿ",
  statUsers: "ಸಕ್ರಿಯ ಬಳಕೆದಾರರು",
  statAssets: "ಯೋಜಿತ ಆಸ್ತಿಗಳು",
  statSatisfaction: "ಬಳಕೆದಾರ ತೃಪ್ತಿ",
  portfolioValue: "ಪೋರ್ಟ್‌ಫೋಲಿಯೊ ಮೌಲ್ಯ",
  wealthOverview: "ವೆಲ್ತ್ ಓವರ್‌ವ್ಯೂ",
  stableGrowth: "ಸ್ಥಿರ ಬೆಳವಣಿಗೆ",
  stableGrowthDesc:
    "SIP, ವಿಮೆ ಮತ್ತು ದೀರ್ಘಕಾಲದ ಹಣಕಾಸು ಗುರಿಗಳಲ್ಲಿ ಸ್ಮಾರ್ಟ್ ಹಂಚಿಕೆ.",
  monthlySip: "ಮಾಸಿಕ SIP",
  yearlyGrowth: "ವಾರ್ಷಿಕ ಬೆಳವಣಿಗೆ",
  retirementGoal: "ನಿವೃತ್ತಿ ಗುರಿ",
  emergencyFund: "ತುರ್ತು ನಿಧಿ",
  secureGuided: "ಸುರಕ್ಷಿತ ಮತ್ತು ಮಾರ್ಗದರ್ಶಿತ",

  servicesBadge: "ಪ್ರೀಮಿಯಂ ಹಣಕಾಸು ಸೇವೆಗಳು",
  servicesTitle: "ನಮ್ಮ ಸೇವೆಗಳು",
  servicesDescription:
    "ನಿಮ್ಮ ಸಂಪತ್ತನ್ನು ಬೆಳೆಸಲು, ರಕ್ಷಿಸಲು ಮತ್ತು ಆತ್ಮವಿಶ್ವಾಸದಿಂದ ನಿರ್ವಹಿಸಲು ಸಮಗ್ರ ಹಣಕಾಸು ಪರಿಹಾರಗಳು.",
  serviceInvestmentPlanning: "ಹೂಡಿಕೆ ಯೋಜನೆ",
  serviceInvestmentPlanningDesc:
    "ನಿಮ್ಮ ಹಣಕಾಸು ಗುರಿಗಳಿಗೆ ತಕ್ಕ ತಂತ್ರಯುತ ಹೂಡಿಕೆ ಯೋಜನೆಗಳು.",
  serviceRiskManagement: "ಅಪಾಯ ನಿರ್ವಹಣೆ",
  serviceRiskManagementDesc:
    "ವಿಸ್ತೃತ ಅಪಾಯ ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ನಿರ್ವಹಣಾ ತಂತ್ರಗಳಿಂದ ನಿಮ್ಮ ಸಂಪತ್ತನ್ನು ರಕ್ಷಿಸಿ.",
  servicePortfolioManagement: "ಪೋರ್ಟ್‌ಫೋಲಿಯೊ ನಿರ್ವಹಣೆ",
  servicePortfolioManagementDesc:
    "ಮತ್ತಷ್ಟು ಲಾಭ ಮತ್ತು ಕಡಿಮೆ ಅಪಾಯಕ್ಕಾಗಿ ವೈವಿಧ್ಯಮಯ ಪೋರ್ಟ್‌ಫೋಲಿಯೊ ಪರಿಹಾರಗಳು.",
  serviceWealthGrowth: "ಸಂಪತ್ತು ವೃದ್ಧಿ",
  serviceWealthGrowthDesc:
    "ಸಾಬೀತಾದ ಹೂಡಿಕೆ ತಂತ್ರಗಳಿಂದ ಸಂಪತ್ತಿನ ವೃದ್ಧಿಯನ್ನು ವೇಗಗೊಳಿಸಿ.",
  serviceTaxPlanning: "ತೆರಿಗೆ ಯೋಜನೆ",
  serviceTaxPlanningDesc:
    "ಸ್ಮಾರ್ಟ್ ತೆರಿಗೆ-ಉಳಿತಾಯ ತಂತ್ರಗಳಿಂದ ಹೂಡಿಕೆ ಮತ್ತು ಉಳಿತಾಯವನ್ನು ಉತ್ತಮಗೊಳಿಸಿ.",
  serviceExpertGuidance: "ತಜ್ಞ ಮಾರ್ಗದರ್ಶನ",
  serviceExpertGuidanceDesc:
    "ಪ್ರಮಾಣಿತ ಹಣಕಾಸು ಸಲಹೆಗಾರರಿಂದ ವೈಯಕ್ತಿಕ ಸಲಹೆ.",
  serviceInsurancePlanning: "ವಿಮೆ ಯೋಜನೆ",
serviceInsurancePlanningDesc:
  "ಜೀವನ, ಆರೋಗ್ಯ ಮತ್ತು ಆಸ್ತಿ ವಿಮೆಯ ಮೂಲಕ ನಿಮ್ಮ ಆರ್ಥಿಕ ಭವಿಷ್ಯವನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸಿ.",

  calculatorsBadge: "ಸ್ಮಾರ್ಟ್ ಹೂಡಿಕೆ ಸಾಧನಗಳು",
  calculatorsTitle: "ಹಣಕಾಸು ಕ್ಯಾಲ್ಕುಲೇಟರ್‌ಗಳು",
  calculatorsDescription:
    "ಲಾಭದ ಅಂದಾಜು ಮಾಡಲು ಮತ್ತು ಉತ್ತಮ ಹೂಡಿಕೆ ನಿರ್ಧಾರಗಳನ್ನು ತೆಗೆದುಕೊಳ್ಳಲು ಪ್ರೀಮಿಯಂ ಕ್ಯಾಲ್ಕುಲೇಟರ್‌ಗಳನ್ನು ಬಳಸಿ.",
  sipCalculator: "ಎಸ್‌ಐಪಿ ಕ್ಯಾಲ್ಕುಲೇಟರ್",
  sipCalculatorDesc:
    "ಸಿಸ್ಟಮ್ಯಾಟಿಕ್ ಹೂಡಿಕೆ ಯೋಜನೆಗಳ ಸಾಧ್ಯವಾದ ಲಾಭವನ್ನು ಲೆಕ್ಕಿಸಿ",
  lumpsumCalculator: "ಲಂಪ್‌ಸಮ್ ಕ್ಯಾಲ್ಕುಲೇಟರ್",
  lumpsumCalculatorDesc:
    "ಒಮ್ಮೆ ಮಾಡುವ ಹೂಡಿಕೆಯ ಲಾಭದ ಅಂದಾಜು ಮಾಡಿ",
  tryNow: "ಈಗ ಪ್ರಯತ್ನಿಸಿ",

  planningBadge: "ವೈಯಕ್ತಿಕ ವೆಲ್ತ್ ಪ್ಲಾನಿಂಗ್",
  planningTitle: "ವೈಯಕ್ತಿಕ ಹಣಕಾಸು ಯೋಜನೆ",
  planningDescription:
    "ನಿಮ್ಮ ಗುರಿಗಳು, ಅಪಾಯ ಸಾಮರ್ಥ್ಯ ಮತ್ತು ಹೂಡಿಕೆ ಅವಧಿಯನ್ನು ಆಧರಿಸಿದ ಕಸ್ಟಮೈಸ್ ಮಾಡಿದ ಹಣಕಾಸು ಯೋಜನೆ ಪಡೆಯಿರಿ.",
  planningFeature1: "ಗುರಿ ಆಧಾರಿತ ಹೂಡಿಕೆ ತಂತ್ರಗಳು",
  planningFeature2: "ಅಪಾಯ ಮೌಲ್ಯಮಾಪನ ಮತ್ತು ಪೋರ್ಟ್‌ಫೋಲಿಯೊ ಹಂಚಿಕೆ",
  planningFeature3: "ಮಾಸಿಕ ಹೂಡಿಕೆ ಶಿಫಾರಸುಗಳು",
  planningFeature4: "ಡೌನ್‌ಲೋಡ್ ಮಾಡಬಹುದಾದ ಹಣಕಾಸು ವರದಿಗಳು",
  startPlanning: "ಯೋಜನೆ ಪ್ರಾರಂಭಿಸಿ",
  whatYoullGet: "ನೀವು ಪಡೆಯುವುದೇನು",
  planningBenefit1: "ಸಮಗ್ರ ಹಣಕಾಸು ವಿಶ್ಲೇಷಣೆ",
  planningBenefit2: "ಆಸ್ತಿ ಹಂಚಿಕೆ ಶಿಫಾರಸುಗಳು",
  planningBenefit3: "ಮಾಸಿಕ SIP ಸಲಹೆಗಳು",
  planningBenefit4: "ಗುರಿ ಟ್ರ್ಯಾಕಿಂಗ್ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",

  webinarsTitle: "ಮುಂದಿನ ವೆಬಿನಾರ್‌ಗಳು",
  webinarsDescription: "ಹಣಕಾಸು ತಜ್ಞರಿಂದ ಕಲಿಯಿರಿ",
  webinar1Title: "ನಿಮ್ಮ 30ರ ದಶಕದಲ್ಲಿ ಸಂಪತ್ತು ನಿರ್ಮಾಣ",
  webinar2Title: "ತೆರಿಗೆ-ಉಳಿತಾಯ ತಂತ್ರಗಳು 2026",
  webinar3Title: "ಮ್ಯೂಚುವಲ್ ಫಂಡ್ಸ್ ಮಾಸ್ಟರ್‌ಕ್ಲಾಸ್",
  webinar1Date: "ಮಾರ್ಚ್ 28, 2026",
  webinar2Date: "ಮಾರ್ಚ್ 30, 2026",
  webinar3Date: "ಏಪ್ರಿಲ್ 2, 2026",
  webinarSpeakerBy: "ಇವರಿಂದ",
  webinarSpeaker1: "ರಾಜೇಶ್ ಕುಮಾರ್",
  webinarSpeaker2: "ಪ್ರಿಯಾ ಶರ್ಮಾ",
  webinarSpeaker3: "ಅಮಿತ್ ಪಟೇಲ್",
  viewAllWebinars: "ಎಲ್ಲಾ ವೆಬಿನಾರ್‌ಗಳನ್ನು ನೋಡಿ",

  whatsappTitle: "ವಾಟ್ಸ್ಆಪ್‌ನಲ್ಲಿ ತಜ್ಞ ಸಲಹೆ ಪಡೆಯಿರಿ",
  whatsappDescription:
    "ನಮ್ಮ ಹಣಕಾಸು ಸಲಹೆಗಾರರೊಂದಿಗೆ ಚಾಟ್ ಮಾಡಿ ಮತ್ತು ತಕ್ಷಣ ವೈಯಕ್ತಿಕ ಶಿಫಾರಸುಗಳನ್ನು ಪಡೆಯಿರಿ.",
  whatsappCta: "ವಾಟ್ಸ್ಆಪ್ ಚಾಟ್ ಪ್ರಾರಂಭಿಸಿ",
},
    footer: {
  description:
    "ಸ್ಮಾರ್ಟ್ ಹಣಕಾಸು ಯೋಜನೆ ಮತ್ತು ಹೂಡಿಕೆ ಪರಿಹಾರಗಳಿಗೆ ನಿಮ್ಮ ವಿಶ್ವಾಸಾರ್ಹ ಸಹಭಾಗಿ.",
  quickLinks: "ತ್ವರಿತ ಲಿಂಕ್‌ಗಳು",
  calculators: "ಕ್ಯಾಲ್ಕುಲೇಟರ್‌ಗಳು",
  contact: "ಸಂಪರ್ಕಿಸಿ",
  home: "ಮುಖಪುಟ",
  services: "ಸೇವೆಗಳು",
  planner: "ಹಣಕಾಸು ಯೋಜಕ",
  webinars: "ವೆಬಿನಾರ್‌ಗಳು",
  sip: "ಎಸ್‌ಐಪಿ ಕ್ಯಾಲ್ಕುಲೇಟರ್",
  lumpsum: "ಲಂಪ್‌ಸಮ್ ಕ್ಯಾಲ್ಕುಲೇಟರ್",
  copyright: "© 2026 SmartFinance. ಎಲ್ಲಾ ಹಕ್ಕುಗಳು ಕಾಯ್ದಿರಿಸಲಾಗಿದೆ.",
},
  },
} as const;
