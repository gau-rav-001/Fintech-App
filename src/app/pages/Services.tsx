import { useState } from "react";
import { Link } from "react-router";
import { Navbar } from "../components/Navbar";
import { Footer } from "../components/Footer";
import { useAuth } from "../auth/AuthContext";
import {
  TrendingUp,
  Shield,
  Target,
  PieChart,
  Calculator,
  Users,
  Briefcase,
  Award,
  Clock,
  HeadphonesIcon,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../LanguageContext";

const servicesPageContent = {
  en: {
    heroBadge: "Premium Financial Services",
    heroTitle: "Our Services",
    heroDescription:
      "Comprehensive financial solutions designed to help you achieve your goals and secure your future.",

    gridBadge: "Tap Any Card To Explore",
    gridDescription:
      "Flip the cards to discover details and helpful resources.",
    tapToExplore: "Tap to explore",
    viewDetails: "View Details",
    learnMore: "Learn More",
    frontDescription:
      "Smart financial support designed around your specific needs.",

    whyBadge: "Why People Choose Us",
    whyTitle: "Why Choose FinTech?",
    whyDescription: "Your trusted partner for financial success",

    featureExpertTeam: "Expert Team",
    featureExpertTeamDesc:
      "Certified financial advisors with years of experience",
    featureSecurePlatform: "Secure Platform",
    featureSecurePlatformDesc:
      "Bank-grade security for your data and transactions",
    featureSupport: "24/7 Support",
    featureSupportDesc:
      "Round-the-clock assistance when you need it",
    featurePersonalized: "Personalized Service",
    featurePersonalizedDesc:
      "Tailored solutions for your unique needs",

    ctaTitle: "Ready to Start Your Financial Journey?",
    ctaDescription:
      "Schedule a free consultation with our experts and begin building a smarter financial future today.",
    ctaPrimary: "Get Started",
    ctaSecondary: "Try Planner",

    services: [
      {
        title: "Investment Planning",
        description:
          "Strategic investment plans designed to meet your financial goals with optimal returns.",
        features: [
          "Personalized investment strategies",
          "Goal-based planning",
          "Regular portfolio reviews",
        ],
        tag: "Goal Focused",
      },
      {
        title: "Risk Management",
        description:
          "Protect your wealth with comprehensive risk assessment and management strategies.",
        features: [
          "Risk profiling",
          "Insurance planning",
          "Emergency fund setup",
        ],
        tag: "Capital Safety",
      },
      {
        title: "Portfolio Management",
        description:
          "Diversified portfolio solutions to maximize returns while minimizing risks.",
        features: [
          "Asset allocation",
          "Regular rebalancing",
          "Performance tracking",
          "Diversification strategies",
        ],
        tag: "Balanced Allocation",
      },
      {
        title: "Wealth Growth",
        description:
          "Accelerate your wealth creation with proven investment strategies and insights.",
        features: [
          "Growth-focused investments",
          "Compounding strategies",
          "Market insights",
        ],
        tag: "Long-Term Growth",
      },
      {
        title: "Tax Planning",
        description:
          "Smart tax-saving strategies to optimize your investments and maximize savings.",
        features: [
          "Tax-saving investments",
          "Capital gains planning",
          "Tax filing support",
        ],
        tag: "Tax Smart",
      },
      {
        title: "Expert Guidance",
        description:
          "Personalized consultation from certified financial advisors and experts.",
        features: [
          "One-on-one consultations",
          "Financial health checkup",
          "Investment recommendations",
          "Ongoing support",
        ],
        tag: "Advisor Support",
      },
      {
        title: "Retirement Planning",
        description:
          "Secure your golden years with comprehensive retirement planning solutions.",
        features: [
          "Retirement corpus calculation",
          "Pension planning",
          "Healthcare planning",
        ],
        tag: "Future Ready",
      },
      {
        title: "Estate Planning",
        description:
          "Ensure your legacy with proper estate and succession planning.",
        features: [
          "Will drafting",
          "Succession planning",
          "Wealth transfer",
          "Legal documentation",
        ],
        tag: "Legacy Protection",
      },
      {
        title: "Insurance",
        description:
          "Complete insurance solutions — health, life, vehicle, home, and business — to protect everything you value.",
        features: [
          "Health & life insurance plans",
          "Vehicle & property coverage",
          "Business insurance packages",
          "Instant policy issuance",
        ],
        tag: "Full Protection",
      },
    ],
  },

  hi: {
    heroBadge: "प्रीमियम वित्तीय सेवाएं",
    heroTitle: "हमारी सेवाएं",
    heroDescription:
      "आपके लक्ष्यों को पूरा करने और भविष्य को सुरक्षित करने के लिए व्यापक वित्तीय समाधान।",

    gridBadge: "जानने के लिए किसी भी कार्ड पर टैप करें",
    gridDescription:
      "विवरण और उपयोगी जानकारी देखने के लिए कार्ड पलटें।",
    tapToExplore: "जानने के लिए टैप करें",
    viewDetails: "विवरण देखें",
    learnMore: "और जानें",
    frontDescription:
      "आपकी जरूरतों के अनुसार बनाया गया स्मार्ट वित्तीय सहयोग।",

    whyBadge: "लोग हमें क्यों चुनते हैं",
    whyTitle: "FinTech क्यों चुनें?",
    whyDescription: "वित्तीय सफलता के लिए आपका विश्वसनीय साथी",

    featureExpertTeam: "विशेषज्ञ टीम",
    featureExpertTeamDesc:
      "वर्षों के अनुभव वाले प्रमाणित वित्तीय सलाहकार",
    featureSecurePlatform: "सुरक्षित प्लेटफॉर्म",
    featureSecurePlatformDesc:
      "आपके डेटा और लेनदेन के लिए बैंक-स्तरीय सुरक्षा",
    featureSupport: "24/7 सहायता",
    featureSupportDesc:
      "जब भी जरूरत हो, हर समय सहायता",
    featurePersonalized: "व्यक्तिगत सेवा",
    featurePersonalizedDesc:
      "आपकी आवश्यकताओं के अनुसार समाधान",

    ctaTitle: "क्या आप अपनी वित्तीय यात्रा शुरू करने के लिए तैयार हैं?",
    ctaDescription:
      "हमारे विशेषज्ञों के साथ निःशुल्क परामर्श लें और बेहतर वित्तीय भविष्य बनाना शुरू करें।",
    ctaPrimary: "शुरू करें",
    ctaSecondary: "प्लानर देखें",

    services: [
      {
        title: "निवेश योजना",
        description:
          "आपके वित्तीय लक्ष्यों के लिए रणनीतिक निवेश योजनाएं।",
        features: [
          "व्यक्तिगत निवेश रणनीतियां",
          "लक्ष्य-आधारित योजना",
          "नियमित पोर्टफोलियो समीक्षा",
        ],
        tag: "लक्ष्य केंद्रित",
      },
      {
        title: "जोखिम प्रबंधन",
        description:
          "व्यापक जोखिम मूल्यांकन और प्रबंधन रणनीतियों से अपनी संपत्ति सुरक्षित रखें।",
        features: [
          "जोखिम प्रोफाइलिंग",
          "बीमा योजना",
          "आपातकालीन फंड सेटअप",
        ],
        tag: "पूंजी सुरक्षा",
      },
      {
        title: "पोर्टफोलियो प्रबंधन",
        description:
          "रिटर्न बढ़ाने और जोखिम कम करने के लिए विविध पोर्टफोलियो समाधान।",
        features: [
          "एसेट एलोकेशन",
          "नियमित रीबैलेंसिंग",
          "प्रदर्शन ट्रैकिंग",
          "विविधीकरण रणनीतियां",
        ],
        tag: "संतुलित आवंटन",
      },
      {
        title: "संपत्ति वृद्धि",
        description:
          "सिद्ध निवेश रणनीतियों और जानकारी से अपनी संपत्ति तेजी से बढ़ाएं।",
        features: [
          "वृद्धि-केंद्रित निवेश",
          "कंपाउंडिंग रणनीतियां",
          "मार्केट इनसाइट्स",
        ],
        tag: "दीर्घकालीन वृद्धि",
      },
      {
        title: "कर योजना",
        description:
          "टैक्स बचत रणनीतियों से निवेश और बचत को बेहतर बनाएं।",
        features: [
          "टैक्स-बचत निवेश",
          "कैपिटल गेन योजना",
          "टैक्स फाइलिंग सहायता",
        ],
        tag: "टैक्स स्मार्ट",
      },
      {
        title: "विशेषज्ञ मार्गदर्शन",
        description:
          "प्रमाणित वित्तीय सलाहकारों और विशेषज्ञों से व्यक्तिगत परामर्श।",
        features: [
          "वन-टू-वन परामर्श",
          "वित्तीय स्वास्थ्य जांच",
          "निवेश सुझाव",
          "निरंतर सहायता",
        ],
        tag: "सलाहकार सहायता",
      },
      {
        title: "सेवानिवृत्ति योजना",
        description:
          "समग्र सेवानिवृत्ति योजना समाधान के साथ अपने भविष्य को सुरक्षित करें।",
        features: [
          "रिटायरमेंट कॉर्पस गणना",
          "पेंशन योजना",
          "हेल्थकेयर योजना",
        ],
        tag: "भविष्य तैयार",
      },
      {
        title: "एस्टेट प्लानिंग",
        description:
          "उचित उत्तराधिकार योजना के साथ अपनी विरासत सुरक्षित करें।",
        features: [
          "वसीयत तैयार करना",
          "उत्तराधिकार योजना",
          "संपत्ति हस्तांतरण",
          "कानूनी दस्तावेज",
        ],
        tag: "विरासत सुरक्षा",
      },
      {
        title: "बीमा",
        description:
          "स्वास्थ्य, जीवन, वाहन, संपत्ति और व्यवसाय के लिए संपूर्ण बीमा समाधान।",
        features: [
          "स्वास्थ्य और जीवन बीमा",
          "वाहन और संपत्ति बीमा",
          "व्यवसाय बीमा पैकेज",
          "त्वरित पॉलिसी जारी",
        ],
        tag: "पूर्ण सुरक्षा",
      },
    ],
  },

  mr: {
    heroBadge: "प्रीमियम आर्थिक सेवा",
    heroTitle: "आमच्या सेवा",
    heroDescription:
      "तुमची उद्दिष्टे पूर्ण करण्यासाठी आणि भविष्य सुरक्षित करण्यासाठी संपूर्ण आर्थिक उपाय.",

    gridBadge: "कार्ड पाहण्यासाठी टॅप करा",
    gridDescription:
      "तपशील आणि उपयुक्त माहिती पाहण्यासाठी कार्ड पलटा.",
    tapToExplore: "पाहण्यासाठी टॅप करा",
    viewDetails: "तपशील पहा",
    learnMore: "अधिक जाणून घ्या",
    frontDescription:
      "तुमच्या गरजांनुसार तयार केलेला स्मार्ट आर्थिक आधार.",

    whyBadge: "लोक आम्हाला का निवडतात",
    whyTitle: "FinTech का निवडावे?",
    whyDescription: "आर्थिक यशासाठी तुमचा विश्वासू भागीदार",

    featureExpertTeam: "तज्ज्ञ टीम",
    featureExpertTeamDesc:
      "वर्षांच्या अनुभवासह प्रमाणित आर्थिक सल्लागार",
    featureSecurePlatform: "सुरक्षित प्लॅटफॉर्म",
    featureSecurePlatformDesc:
      "तुमच्या डेटासाठी आणि व्यवहारांसाठी बँक-स्तरीय सुरक्षा",
    featureSupport: "24/7 सहाय्य",
    featureSupportDesc:
      "गरज पडल्यास नेहमी उपलब्ध मदत",
    featurePersonalized: "वैयक्तिक सेवा",
    featurePersonalizedDesc:
      "तुमच्या गरजेनुसार उपाय",

    ctaTitle: "तुमची आर्थिक यात्रा सुरू करण्यास तयार आहात?",
    ctaDescription:
      "आमच्या तज्ज्ञांसोबत मोफत सल्लामसलत घ्या आणि अधिक चांगले आर्थिक भविष्य घडवा.",
    ctaPrimary: "सुरू करा",
    ctaSecondary: "प्लॅनर वापरा",

    services: [
      {
        title: "गुंतवणूक नियोजन",
        description:
          "तुमच्या आर्थिक उद्दिष्टांसाठी रणनीतिक गुंतवणूक योजना.",
        features: [
          "वैयक्तिक गुंतवणूक रणनीती",
          "ध्येयाधारित नियोजन",
          "नियमित पोर्टफोलिओ पुनरावलोकन",
        ],
        tag: "ध्येय केंद्रित",
      },
      {
        title: "जोखीम व्यवस्थापन",
        description:
          "संपत्ती सुरक्षित ठेवण्यासाठी व्यापक जोखीम मूल्यांकन आणि व्यवस्थापन.",
        features: [
          "जोखीम प्रोफाइलिंग",
          "विमा नियोजन",
          "आपत्कालीन निधी सेटअप",
        ],
        tag: "भांडवल सुरक्षा",
      },
      {
        title: "पोर्टफोलिओ व्यवस्थापन",
        description:
          "परतावा वाढवण्यासाठी आणि जोखीम कमी करण्यासाठी विविध पोर्टफोलिओ उपाय.",
        features: [
          "मालमत्ता वाटप",
          "नियमित रीबॅलन्सिंग",
          "कामगिरी ट्रॅकिंग",
          "विविधीकरण रणनीती",
        ],
        tag: "संतुलित वाटप",
      },
      {
        title: "संपत्ती वाढ",
        description:
          "सिद्ध गुंतवणूक रणनीती आणि माहितीने संपत्ती निर्मिती वेगवान करा.",
        features: [
          "वाढ-केंद्रित गुंतवणूक",
          "कंपाउंडिंग रणनीती",
          "मार्केट इनसाइट्स",
        ],
        tag: "दीर्घकालीन वाढ",
      },
      {
        title: "कर नियोजन",
        description:
          "कर बचतीच्या रणनीतींनी गुंतवणूक आणि बचत सुधारित करा.",
        features: [
          "कर बचत गुंतवणूक",
          "कॅपिटल गेन नियोजन",
          "कर फाइलिंग मदत",
        ],
        tag: "कर स्मार्ट",
      },
      {
        title: "तज्ज्ञ मार्गदर्शन",
        description:
          "प्रमाणित आर्थिक सल्लागार आणि तज्ज्ञांकडून वैयक्तिक सल्ला.",
        features: [
          "वन-टू-वन सल्लामसलत",
          "आर्थिक आरोग्य तपासणी",
          "गुंतवणूक शिफारसी",
          "सतत सहाय्य",
        ],
        tag: "सल्लागार सहाय्य",
      },
      {
        title: "निवृत्ती नियोजन",
        description:
          "संपूर्ण निवृत्ती नियोजन उपायांनी तुमचे भविष्य सुरक्षित करा.",
        features: [
          "निवृत्ती कॉर्पस गणना",
          "पेन्शन नियोजन",
          "हेल्थकेअर नियोजन",
        ],
        tag: "भविष्यासाठी तयार",
      },
      {
        title: "वारसा नियोजन",
        description:
          "योग्य उत्तराधिकार नियोजनाने तुमचा वारसा सुरक्षित ठेवा.",
        features: [
          "वसीयत तयार करणे",
          "उत्तराधिकार नियोजन",
          "संपत्ती हस्तांतरण",
          "कायदेशीर कागदपत्रे",
        ],
        tag: "वारसा संरक्षण",
      },
      {
        title: "विमा",
        description:
          "आरोग्य, जीवन, वाहन, मालमत्ता आणि व्यवसायासाठी संपूर्ण विमा उपाय.",
        features: [
          "आरोग्य व जीवन विमा",
          "वाहन व मालमत्ता विमा",
          "व्यवसाय विमा पॅकेज",
          "तत्काळ पॉलिसी",
        ],
        tag: "संपूर्ण संरक्षण",
      },
    ],
  },

  kn: {
    heroBadge: "ಪ್ರೀಮಿಯಂ ಹಣಕಾಸು ಸೇವೆಗಳು",
    heroTitle: "ನಮ್ಮ ಸೇವೆಗಳು",
    heroDescription:
      "ನಿಮ್ಮ ಗುರಿಗಳನ್ನು ಸಾಧಿಸಲು ಮತ್ತು ಭವಿಷ್ಯವನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸಲು ಸಮಗ್ರ ಹಣಕಾಸು ಪರಿಹಾರಗಳು.",

    gridBadge: "ಅನ್ವೇಷಿಸಲು ಯಾವುದಾದರೂ ಕಾರ್ಡ್ ಅನ್ನು ಟ್ಯಾಪ್ ಮಾಡಿ",
    gridDescription:
      "ವಿವರಗಳು ಮತ್ತು ಉಪಯುಕ್ತ ಮಾಹಿತಿಯನ್ನು ನೋಡಲು ಕಾರ್ಡ್‌ಗಳನ್ನು ತಿರುಗಿಸಿ.",
    tapToExplore: "ನೋಡಲು ಟ್ಯಾಪ್ ಮಾಡಿ",
    viewDetails: "ವಿವರಗಳನ್ನು ನೋಡಿ",
    learnMore: "ಇನ್ನಷ್ಟು ತಿಳಿಯಿರಿ",
    frontDescription:
      "ನಿಮ್ಮ ಅಗತ್ಯಗಳಿಗೆ ಹೊಂದುವ ಸ್ಮಾರ್ಟ್ ಹಣಕಾಸು ಬೆಂಬಲ.",

    whyBadge: "ಜನರು ನಮ್ಮನ್ನು ಏಕೆ ಆಯ್ಕೆ ಮಾಡುತ್ತಾರೆ",
    whyTitle: "FinTech ಅನ್ನು ಏಕೆ ಆಯ್ಕೆ ಮಾಡಬೇಕು?",
    whyDescription: "ಹಣಕಾಸು ಯಶಸ್ಸಿಗೆ ನಿಮ್ಮ ವಿಶ್ವಾಸಾರ್ಹ ಭಾಗಸ್ಫೂರ್ತಿ",

    featureExpertTeam: "ತಜ್ಞ ತಂಡ",
    featureExpertTeamDesc:
      "ವರ್ಷಗಳ ಅನುಭವದ ಪ್ರಮಾಣಿತ ಹಣಕಾಸು ಸಲಹೆಗಾರರು",
    featureSecurePlatform: "ಸುರಕ್ಷಿತ ವೇದಿಕೆ",
    featureSecurePlatformDesc:
      "ನಿಮ್ಮ ಡೇಟಾ ಮತ್ತು ವ್ಯವಹಾರಗಳಿಗೆ ಬ್ಯಾಂಕ್ ಮಟ್ಟದ ಭದ್ರತೆ",
    featureSupport: "24/7 ಬೆಂಬಲ",
    featureSupportDesc:
      "ನಿಮಗೆ ಬೇಕಾದಾಗ ಎಲ್ಲ ಸಮಯದಲ್ಲೂ ಸಹಾಯ",
    featurePersonalized: "ವೈಯಕ್ತಿಕ ಸೇವೆ",
    featurePersonalizedDesc:
      "ನಿಮ್ಮ ಅಗತ್ಯಗಳಿಗೆ ಹೊಂದಿದ ಪರಿಹಾರಗಳು",

    ctaTitle: "ನಿಮ್ಮ ಹಣಕಾಸು ಪ್ರಯಾಣ ಪ್ರಾರಂಭಿಸಲು ಸಿದ್ಧವೇ?",
    ctaDescription:
      "ನಮ್ಮ ತಜ್ಞರೊಂದಿಗೆ ಉಚಿತ ಸಮಾಲೋಚನೆ ಪಡೆಯಿರಿ ಮತ್ತು ಉತ್ತಮ ಹಣಕಾಸು ಭವಿಷ್ಯ ನಿರ್ಮಿಸಲು ಪ್ರಾರಂಭಿಸಿ.",
    ctaPrimary: "ಪ್ರಾರಂಭಿಸಿ",
    ctaSecondary: "ಪ್ಲಾನರ್ ಪ್ರಯತ್ನಿಸಿ",

    services: [
      {
        title: "ಹೂಡಿಕೆ ಯೋಜನೆ",
        description:
          "ನಿಮ್ಮ ಹಣಕಾಸು ಗುರಿಗಳಿಗೆ ತಕ್ಕ ತಂತ್ರಯುತ ಹೂಡಿಕೆ ಯೋಜನೆಗಳು.",
        features: [
          "ವೈಯಕ್ತಿಕ ಹೂಡಿಕೆ ತಂತ್ರಗಳು",
          "ಗುರಿ ಆಧಾರಿತ ಯೋಜನೆ",
          "ನಿಯಮಿತ ಪೋರ್ಟ್‌ಫೋಲಿಯೊ ವಿಮರ್ಶೆಗಳು",
        ],
        tag: "ಗುರಿ ಕೇಂದ್ರಿತ",
      },
      {
        title: "ಅಪಾಯ ನಿರ್ವಹಣೆ",
        description:
          "ವಿಸ್ತೃತ ಅಪಾಯ ಮೌಲ್ಯಮಾಪನ ಮತ್ತು ನಿರ್ವಹಣಾ ತಂತ್ರಗಳಿಂದ ನಿಮ್ಮ ಸಂಪತ್ತನ್ನು ರಕ್ಷಿಸಿ.",
        features: [
          "ಅಪಾಯ ಪ್ರೊಫೈಲಿಂಗ್",
          "ವಿಮೆ ಯೋಜನೆ",
          "ತುರ್ತು ನಿಧಿ ವ್ಯವಸ್ಥೆ",
        ],
        tag: "ಮೂಲಧನ ಸುರಕ್ಷತೆ",
      },
      {
        title: "ಪೋರ್ಟ್‌ಫೋಲಿಯೊ ನಿರ್ವಹಣೆ",
        description:
          "ಲಾಭ ಹೆಚ್ಚಿಸಿ ಅಪಾಯ ಕಡಿಮೆ ಮಾಡಲು ವೈವಿಧ್ಯಮಯ ಪೋರ್ಟ್‌ಫೋಲಿಯೊ ಪರಿಹಾರಗಳು.",
        features: [
          "ಆಸ್ತಿ ಹಂಚಿಕೆ",
          "ನಿಯಮಿತ ಮರುಸಮತೋಲನ",
          "ಕಾರ್ಯಕ್ಷಮತೆ ಟ್ರ್ಯಾಕಿಂಗ್",
          "ವೈವಿಧ್ಯೀಕರಣ ತಂತ್ರಗಳು",
        ],
        tag: "ಸಮತೋಲನ ಹಂಚಿಕೆ",
      },
      {
        title: "ಸಂಪತ್ತು ವೃದ್ಧಿ",
        description:
          "ಸಾಬೀತಾದ ಹೂಡಿಕೆ ತಂತ್ರಗಳು ಮತ್ತು ಒಳನೋಟಗಳಿಂದ ನಿಮ್ಮ ಸಂಪತ್ತಿನ ವೃದ್ಧಿಯನ್ನು ವೇಗಗೊಳಿಸಿ.",
        features: [
          "ವೃದ್ಧಿ ಕೇಂದ್ರಿತ ಹೂಡಿಕೆಗಳು",
          "ಕಂಪೌಂಡಿಂಗ್ ತಂತ್ರಗಳು",
          "ಮಾರ್ಕೆಟ್ ಒಳನೋಟಗಳು",
        ],
        tag: "ದೀರ್ಘಕಾಲದ ವೃದ್ಧಿ",
      },
      {
        title: "ತೆರಿಗೆ ಯೋಜನೆ",
        description:
          "ತೆರಿಗೆ ಉಳಿತಾಯ ತಂತ್ರಗಳಿಂದ ಹೂಡಿಕೆ ಮತ್ತು ಉಳಿತಾಯವನ್ನು ಉತ್ತಮಗೊಳಿಸಿ.",
        features: [
          "ತೆರಿಗೆ ಉಳಿತಾಯ ಹೂಡಿಕೆಗಳು",
          "ಕ್ಯಾಪಿಟಲ್ ಗೆನ್ಸ್ ಯೋಜನೆ",
          "ತೆರಿಗೆ ಫೈಲಿಂಗ್ ಬೆಂಬಲ",
        ],
        tag: "ತೆರಿಗೆ ಸ್ಮಾರ್ಟ್",
      },
      {
        title: "ತಜ್ಞ ಮಾರ್ಗದರ್ಶನ",
        description:
          "ಪ್ರಮಾಣಿತ ಹಣಕಾಸು ಸಲಹೆಗಾರರು ಮತ್ತು ತಜ್ಞರಿಂದ ವೈಯಕ್ತಿಕ ಸಮಾಲೋಚನೆ.",
        features: [
          "ಒನ್-ಟು-ಒನ್ ಸಮಾಲೋಚನೆ",
          "ಹಣಕಾಸು ಆರೋಗ್ಯ ಪರಿಶೀಲನೆ",
          "ಹೂಡಿಕೆ ಶಿಫಾರಸುಗಳು",
          "ನಿರಂತರ ಬೆಂಬಲ",
        ],
        tag: "ಸಲಹೆಗಾರ ಬೆಂಬಲ",
      },
      {
        title: "ನಿವೃತ್ತಿ ಯೋಜನೆ",
        description:
          "ಸಮಗ್ರ ನಿವೃತ್ತಿ ಯೋಜನೆ ಪರಿಹಾರಗಳಿಂದ ನಿಮ್ಮ ಭವಿಷ್ಯವನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸಿ.",
        features: [
          "ನಿವೃತ್ತಿ ನಿಧಿ ಲೆಕ್ಕಾಚಾರ",
          "ಪಿಂಚಣಿ ಯೋಜನೆ",
          "ಆರೋಗ್ಯ ಯೋಜನೆ",
        ],
        tag: "ಭವಿಷ್ಯ ಸಿದ್ಧ",
      },
      {
        title: "ಎಸ್ಟೇಟ್ ಯೋಜನೆ",
        description:
          "ಸರಿಯಾದ ಉತ್ತರಾಧಿಕಾರ ಯೋಜನೆಯಿಂದ ನಿಮ್ಮ ಪರಂಪರೆಯನ್ನು ಸುರಕ್ಷಿತಗೊಳಿಸಿ.",
        features: [
          "ವಿಲ್ ರಚನೆ",
          "ಉತ್ತರಾಧಿಕಾರ ಯೋಜನೆ",
          "ಸಂಪತ್ತು ವರ್ಗಾವಣೆ",
          "ಕಾನೂನು ದಾಖಲೆಗಳು",
        ],
        tag: "ಪಾರಂಪರಿಕ ರಕ್ಷಣೆ",
      },
      {
        title: "ವಿಮೆ",
        description:
          "ಆರೋಗ್ಯ, ಜೀವ, ವಾಹನ, ಆಸ್ತಿ ಮತ್ತು ವ್ಯಾಪಾರಕ್ಕಾಗಿ ಸಂಪೂರ್ಣ ವಿಮಾ ಪರಿಹಾರಗಳು.",
        features: [
          "ಆರೋಗ್ಯ ಮತ್ತು ಜೀವ ವಿಮೆ",
          "ವಾಹನ ಮತ್ತು ಆಸ್ತಿ ವಿಮೆ",
          "ವ್ಯಾಪಾರ ವಿಮೆ ಪ್ಯಾಕೇಜ್",
          "ತ್ವರಿತ ಪಾಲಿಸಿ ನೀಡಿಕೆ",
        ],
        tag: "ಸಂಪೂರ್ಣ ರಕ್ಷಣೆ",
      },
    ],
  },
} as const;

const servicesMeta = [
  {
    icon: <Target className="w-8 h-8" />,
    learnMoreUrl: "https://www.investor.gov/introduction-investing",
    accent: "from-emerald-700 to-green-500",
    softBg: "from-emerald-50/80 to-green-100/40",
    glow: "bg-emerald-300/25",
  },
  {
    icon: <Shield className="w-8 h-8" />,
    learnMoreUrl:
      "https://www.investor.gov/introduction-investing/getting-started/asset-allocation",
    accent: "from-teal-700 to-emerald-500",
    softBg: "from-teal-50/80 to-emerald-100/40",
    glow: "bg-teal-300/25",
  },
  {
    icon: <PieChart className="w-8 h-8" />,
    learnMoreUrl:
      "https://www.investor.gov/introduction-investing/investing-basics/glossary/diversification",
    accent: "from-sky-700 to-cyan-500",
    softBg: "from-sky-50/80 to-cyan-100/40",
    glow: "bg-sky-300/25",
  },
  {
    icon: <TrendingUp className="w-8 h-8" />,
    learnMoreUrl:
      "https://www.investor.gov/additional-resources/general-resources/publications-research/info-sheets/beginners-guide-asset",
    accent: "from-lime-700 to-green-500",
    softBg: "from-lime-50/80 to-green-100/40",
    glow: "bg-lime-300/25",
  },
  {
    icon: <Calculator className="w-8 h-8" />,
    learnMoreUrl:
      "https://www.irs.gov/newsroom/year-round-tax-planning-pointers-for-taxpayers",
    accent: "from-amber-700 to-orange-500",
    softBg: "from-amber-50/80 to-orange-100/40",
    glow: "bg-amber-300/25",
  },
  {
    icon: <Users className="w-8 h-8" />,
    learnMoreUrl:
      "https://www.investor.gov/introduction-investing/getting-started/working-investment-professional",
    accent: "from-violet-700 to-fuchsia-500",
    softBg: "from-violet-50/80 to-fuchsia-100/40",
    glow: "bg-violet-300/25",
  },
  {
    icon: <Briefcase className="w-8 h-8" />,
    learnMoreUrl: "https://www.ssa.gov/retirement/plan-for-retirement",
    accent: "from-indigo-700 to-blue-500",
    softBg: "from-indigo-50/80 to-blue-100/40",
    glow: "bg-indigo-300/25",
  },
  {
    icon: <Award className="w-8 h-8" />,
    learnMoreUrl:
      "https://www.consumerfinance.gov/consumer-tools/managing-someone-elses-money/",
    accent: "from-rose-700 to-pink-500",
    softBg: "from-rose-50/80 to-pink-100/40",
    glow: "bg-rose-300/25",
  },
  {
    icon: <ShieldCheck className="w-8 h-8" />,
    learnMoreUrl: "/insurance",
    accent: "from-sky-700 to-blue-500",
    softBg: "from-sky-50/80 to-blue-100/40",
    glow: "bg-sky-300/25",
    isInternal: true,
  },
];

export function Services() {
  const { language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const page =
    servicesPageContent[language as keyof typeof servicesPageContent];

  const mergedServices = servicesMeta.map((meta, index) => ({
    ...meta,
    ...page.services[index],
  }));

  return (
    <div className="min-h-screen bg-[#F7F9FB]">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-[linear-gradient(135deg,#0f2a1d_0%,#1A5F3D_45%,#2D7A4E_75%,#4aa06f_100%)] text-white py-16 md:py-20">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#B8E986]/15 blur-3xl" />
          <div className="absolute left-[15%] top-[20%] h-[180px] w-[180px] rounded-full bg-white/5 blur-3xl" />
          <div className="absolute right-[10%] bottom-[15%] h-[220px] w-[220px] rounded-full bg-[#3FAF7D]/15 blur-3xl" />
        </div>
        <div className="absolute inset-0 opacity-[0.10] [background-image:linear-gradient(rgba(255,255,255,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white/85 backdrop-blur mb-4">
              {page.heroBadge}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4 tracking-[-0.03em]">
              {page.heroTitle}
            </h1>
            <p className="text-lg md:text-xl text-white/80 leading-8">
              {page.heroDescription}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── Services Grid ── */}
      <section className="relative py-24 overflow-hidden bg-[radial-gradient(circle_at_top,rgba(63,175,125,0.10),transparent_30%),linear-gradient(to_bottom,#f8fbf9,#eef5f1_45%,#ffffff_100%)]">
        <div className="absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(26,95,61,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(26,95,61,0.05)_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="absolute top-0 left-1/4 h-72 w-72 rounded-full bg-[#B8E986]/20 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-72 w-72 rounded-full bg-[#3FAF7D]/10 blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="inline-flex items-center rounded-full border border-[#d7eadf] bg-white/70 backdrop-blur px-4 py-2 text-sm font-medium text-[#1A5F3D] mb-4">
              {page.gridBadge}
            </div>
            <p className="text-gray-600 text-base leading-7">
              {page.gridDescription}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-7">
            {mergedServices.map((service, index) => (
              <ServiceFlipCard
                key={index}
                {...service}
                index={index}
                frontDescription={page.frontDescription}
                tapToExplore={page.tapToExplore}
                viewDetails={page.viewDetails}
                learnMoreLabel={page.learnMore}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Choose Us ── */}
      <section className="relative py-24 overflow-hidden bg-white">
        <div className="absolute top-0 left-1/4 h-64 w-64 rounded-full bg-[#B8E986]/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-64 w-64 rounded-full bg-[#3FAF7D]/10 blur-3xl" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center rounded-full border border-[#d7eadf] bg-[#f6fbf8] px-4 py-2 text-sm font-medium text-[#1A5F3D] mb-5">
              {page.whyBadge}
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-[-0.02em]">
              {page.whyTitle}
            </h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto leading-7">
              {page.whyDescription}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Award className="w-7 h-7" />}
              title={page.featureExpertTeam}
              description={page.featureExpertTeamDesc}
            />
            <FeatureCard
              icon={<Shield className="w-7 h-7" />}
              title={page.featureSecurePlatform}
              description={page.featureSecurePlatformDesc}
            />
            <FeatureCard
              icon={<Clock className="w-7 h-7" />}
              title={page.featureSupport}
              description={page.featureSupportDesc}
            />
            <FeatureCard
              icon={<HeadphonesIcon className="w-7 h-7" />}
              title={page.featurePersonalized}
              description={page.featurePersonalizedDesc}
            />
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative py-20 overflow-hidden bg-[linear-gradient(135deg,#0c1f17_0%,#123d2a_40%,#1A5F3D_70%,#2D7A4E_100%)] text-white">
        <div className="absolute inset-0">
          <div className="absolute left-1/2 top-[45%] h-[350px] w-[350px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#3FAF7D]/15 blur-[100px]" />
        </div>
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(255,255,255,0.25)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.25)_1px,transparent_1px)] [background-size:40px_40px]" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-block rounded-[28px] border border-white/15 bg-white/10 backdrop-blur-xl px-8 py-8 shadow-[0_10px_40px_rgba(0,0,0,0.25)]">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 tracking-[-0.02em]">
              {page.ctaTitle}
            </h2>
            <p className="text-lg mb-8 text-white/80 max-w-2xl mx-auto leading-8">
              {page.ctaDescription}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to={isAuthenticated ? "/dashboard" : "/signup"}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-[#D8F46B] text-black font-semibold shadow-[0_10px_30px_rgba(184,233,134,0.35)] hover:scale-105 hover:shadow-[0_15px_40px_rgba(184,233,134,0.45)] transition-all"
              >
                {isAuthenticated ? "Go to Dashboard" : page.ctaPrimary}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/planner"
                className="px-8 py-4 rounded-full border border-white/20 bg-white/10 text-white font-semibold hover:bg-white hover:text-[#1A5F3D] transition-all"
              >
                {page.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

// ─── Flip Card ───────────────────────────────────────────────────────────────

function ServiceFlipCard({
  icon,
  title,
  description,
  features,
  learnMoreUrl,
  tag,
  accent,
  softBg,
  glow,
  index,
  frontDescription,
  tapToExplore,
  viewDetails,
  learnMoreLabel,
  isInternal,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  learnMoreUrl: string;
  tag: string;
  accent: string;
  softBg: string;
  glow: string;
  index: number;
  frontDescription: string;
  tapToExplore: string;
  viewDetails: string;
  learnMoreLabel: string;
  isInternal?: boolean;
}) {
  const [flipped, setFlipped] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08 }}
      className="group [perspective:1200px]"
    >
      <div
        className={`relative h-[340px] w-full cursor-pointer rounded-[28px] transition-transform duration-700 [transform-style:preserve-3d] ${
          flipped ? "[transform:rotateY(180deg)]" : ""
        }`}
        onClick={() => setFlipped((prev) => !prev)}
      >
        {/* Front */}
        <div
          className={`absolute inset-0 rounded-[28px] border border-white/70 bg-gradient-to-br ${softBg} backdrop-blur-xl shadow-[0_10px_30px_rgba(15,23,42,0.06)] [backface-visibility:hidden] overflow-hidden`}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/70 to-transparent opacity-90" />
          <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full ${glow} blur-3xl opacity-80`} />
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/60" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.20] [background-image:linear-gradient(rgba(26,95,61,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(26,95,61,0.07)_1px,transparent_1px)] [background-size:28px_28px]" />

          <div className="relative z-10 flex h-full flex-col justify-between p-7">
            <div className="flex items-start justify-between">
              <div className="inline-flex items-center rounded-full border border-white/70 bg-white/55 px-3 py-1 text-xs font-semibold text-gray-700 backdrop-blur">
                {tag}
              </div>
              <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-[0_10px_25px_rgba(0,0,0,0.15)]`}>
                {icon}
              </div>
            </div>

            <div>
              <h3 className="text-3xl font-bold text-gray-900 tracking-[-0.03em] leading-tight">
                {title}
              </h3>
              <p className="mt-3 text-gray-600 leading-7 text-sm max-w-md">
                {frontDescription}
              </p>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-[#1A5F3D]">
                {tapToExplore}
              </p>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/60 px-4 py-2 text-sm font-semibold text-gray-800 backdrop-blur">
                {viewDetails}
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        {/* Back */}
        <div className="absolute inset-0 rounded-[28px] border border-white/70 bg-white/80 backdrop-blur-xl shadow-[0_12px_35px_rgba(15,23,42,0.08)] [backface-visibility:hidden] [transform:rotateY(180deg)] overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/85 to-transparent opacity-95" />
          <div className={`pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full ${glow} blur-3xl opacity-80`} />
          <div className="pointer-events-none absolute inset-0 rounded-[28px] ring-1 ring-inset ring-white/60" />

          <div className="relative z-10 flex h-full flex-col p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center rounded-full border border-[#dbeee3] bg-[#f3faf6] px-3 py-1 text-xs font-semibold text-[#1A5F3D] mb-2">
                  {tag}
                </div>
                <h3 className="text-xl font-bold text-gray-900 tracking-[-0.02em] leading-tight">
                  {title}
                </h3>
                <p className="text-gray-500 mt-1.5 leading-6 text-sm">
                  {description}
                </p>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setFlipped(false);
                }}
                className="shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-[#eef8f2] text-[#1A5F3D] hover:bg-[#1A5F3D] hover:text-white transition-all"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-1.5 mb-5 mt-1 flex-1">
              {features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1A5F3D] mt-2 flex-shrink-0" />
                  <span className="text-gray-700 text-sm leading-6">{feature}</span>
                </div>
              ))}
            </div>

            {isInternal ? (
              <Link
                to={learnMoreUrl}
                onClick={(e) => e.stopPropagation()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#eef8f2] px-4 py-2.5 text-sm font-semibold text-[#1A5F3D] transition-all duration-300 hover:bg-[#1A5F3D] hover:text-white"
              >
                {learnMoreLabel}
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#eef8f2] px-4 py-2.5 text-sm font-semibold text-[#1A5F3D] transition-all duration-300 hover:bg-[#1A5F3D] hover:text-white"
              >
                {learnMoreLabel}
                <ArrowRight className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Feature Card ─────────────────────────────────────────────────────────────

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group text-center rounded-[24px] border border-gray-100 bg-white p-8 shadow-sm transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_20px_50px_rgba(26,95,61,0.08)]">
      <div className="w-14 h-14 bg-gradient-to-br from-[#1A5F3D] to-[#3FAF7D] rounded-xl flex items-center justify-center text-white mx-auto mb-5 shadow-[0_8px_20px_rgba(26,95,61,0.22)] transition duration-500 group-hover:scale-110">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-sm leading-6">{description}</p>
    </div>
  );
}