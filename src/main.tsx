import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import { LanguageProvider } from "./app/LanguageContext";
import { AuthProvider } from "./app/auth/AuthContext";
import { AdvisorAuthProvider } from "./app/auth/AdvisorAuthContext";
import "./styles/index.css";
import { seedDemoProfile } from "./app/data/seedDemoProfile";

// Seed demo data before render (no-op if already done)
seedDemoProfile();

createRoot(document.getElementById("root")!).render(
  <AdvisorAuthProvider>
    <AuthProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </AuthProvider>
  </AdvisorAuthProvider>
);