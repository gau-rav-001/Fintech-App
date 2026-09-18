import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { LanguageProvider } from "./app/LanguageContext";
import { AuthProvider } from "./app/auth/AuthContext";
import { AdvisorAuthProvider } from "./app/auth/AdvisorAuthContext";
import { ThemeProvider } from "./app/ThemeContext";
import "./styles/index.css";
import { seedDemoProfile } from "./app/data/seedDemoProfile";

seedDemoProfile();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <AdvisorAuthProvider>
      <AuthProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </AuthProvider>
    </AdvisorAuthProvider>
  </ThemeProvider>
);