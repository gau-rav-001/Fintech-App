// AIChat.tsx — Full-page AI Wealth Assistant
// All AI features (health, goals, retirement, investments, loans, tax, forecast, what-if)
// are accessible through the unified chat interface via quick-action chips.

import { AIAssistant } from "../components/AIAssistant";

export default function AIChat() {
  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">AI Wealth Assistant</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Ask about your financial health, investments, loans, goals, retirement, tax planning, and more.
          </p>
        </div>
        <AIAssistant inline />
      </div>
    </div>
  );
}
