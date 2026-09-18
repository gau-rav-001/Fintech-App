// ── SmartFinance AI Wealth Assistant ──────────────────────────────────────────
"use strict";

const { AIConversation, AIMessage } = require("../models/AIEntities");
const tools = require("./tools/financialTools");
const { getModel, DEFAULT_CHAT_MODEL } = require("./llm/gemini");
const { callGroq, callOpenRouter, callOllama } = require("./llm/providerClient");
const {
  queryCache,
  solveFinancialMath,
  getInstantCasualResponse,
  getFrequentFinanceResponse,
  generateSuggestedPrompts,
} = require("./brain/financialBrain");
const { getLiveStockQuote } = require("./services/marketDataService");
const { getLiveGroundingContext } = require("./services/webSearchService");

// ── Config ────────────────────────────────────────────────────────────────────
const AI_CONFIG = {
  model: process.env.GEMINI_MODEL_CHAT || DEFAULT_CHAT_MODEL,
  maxContextTokens: parseInt(process.env.AI_MAX_CONTEXT_TOKENS || "14000", 10),
  maxConversationTokens: parseInt(process.env.AI_MAX_CONVERSATION_TOKENS || "70000", 10),
  warnConversationTokens: parseInt(process.env.AI_WARN_CONVERSATION_TOKENS || "56000", 10),
  systemPrompt: `You are SmartFinance AI — an advanced, omni-capable intelligent assistant and senior wealth advisor.

Core Capabilities:
1. UNIVERSAL INTELLIGENCE: You are fully equipped to answer ANY query across all disciplines — coding & software architecture, mathematics, science, technology, business, career guidance, creative writing, translation, general reasoning, and everyday problem solving. Never refuse a general query.
2. WEALTH & FINANCIAL MASTERY: For personal finance, investing, tax planning, budgeting, debt management, and retirement, you provide elite, actionable advisory tailored to the Indian financial ecosystem (SEBI, RBI, Income Tax Act, Mutual Funds, Stocks, Gold, Real Estate, NPS, PPF, EPF).
3. PERSONAL DATA REASONING: When real account/profile data is provided, treat it as ground truth. Connect cause and effect across income, expenses, loans, investments, and goals with exact numbers.
4. COMMUNICATION STYLE:
   - Sharp, friendly, and structured. Match the user's depth (concise for direct questions, thorough for open-ended analysis).
   - Use clean Markdown formatting: bold highlights, clear bullet points, code blocks with syntax highlighting when providing code, and structured sections.
   - For currency, use ₹, Lakhs (L), and Crores (Cr) in Indian context, or standard currency when specified.
   - If data or facts are unavailable, state it plainly without guessing.`,
};

function estimateTokens(text = "") {
  return Math.ceil(String(text).length / 4);
}

function compactText(text = "", maxChars = 900) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (clean.length <= maxChars) return clean;
  return `${clean.slice(0, maxChars - 1).trim()}…`;
}

function conversationTokenEstimate(messages) {
  return messages.reduce((sum, m) => sum + estimateTokens(m.content), 0);
}

function buildOlderConversationSummary(messages) {
  if (!messages.length) return "";

  const userTurns = messages.filter(m => m.role === "user");
  const firstUser = userTurns[0]?.content;
  const recentTopics = userTurns.slice(-6).map(m => compactText(m.content, 180));

  return [
    "Earlier conversation summary for continuity:",
    firstUser ? `- Conversation started with: ${compactText(firstUser, 260)}` : "",
    recentTopics.length ? `- Earlier user topics: ${recentTopics.join(" | ")}` : "",
    "Use this only as background. Give priority to the latest user question and the recent turns below.",
    "If the user asks a new question, answer the new question directly and do not repeat earlier answers unless asked for a recap.",
  ].filter(Boolean).join("\n");
}

function normalizeGeminiHistory(history) {
  const normalized = [];

  for (const item of history) {
    const text = item?.parts?.[0]?.text;
    if (!text || !text.trim()) continue;

    const role = item.role === "model" ? "model" : "user";
    const last = normalized[normalized.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${text}`;
    } else {
      normalized.push({ role, parts: [{ text }] });
    }
  }

  while (normalized[0]?.role === "model") normalized.shift();
  return normalized;
}

function buildGeminiHistory(allMessages) {
  const previousMessages = allMessages.slice(0, -1);
  const maxContextTokens = AI_CONFIG.maxContextTokens;
  const selected = [];
  let usedTokens = 0;

  for (let i = previousMessages.length - 1; i >= 0; i--) {
    const msg = previousMessages[i];
    const cost = estimateTokens(msg.content) + 16;
    if (selected.length >= 28 || usedTokens + cost > maxContextTokens) break;
    selected.unshift(msg);
    usedTokens += cost;
  }

  const omitted = previousMessages.slice(0, previousMessages.length - selected.length);
  const history = [];
  const summary = buildOlderConversationSummary(omitted);

  if (summary) {
    history.push({
      role: "user",
      parts: [{ text: summary }],
    });
  }

  history.push(...selected.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  })));

  return {
    history: normalizeGeminiHistory(history),
    omittedCount: omitted.length,
    selectedCount: selected.length,
    usedTokens,
  };
}

function buildConversationLimitMessage(totalTokens, messageCount) {
  return `This chat is getting too long for me to use reliably in one context window.

You have about ${Math.round(totalTokens).toLocaleString("en-IN")} tokens across ${messageCount} messages in this thread. If I continue here, I may miss earlier details or repeat myself.

Please start a new chat and paste a short summary of what you want to continue. A useful starter would be:

> Continue from my previous financial planning chat. My current focus is: [goal/problem]. Key numbers are: [income, expenses, investments, loans, goals].`;
}

function appendContextWarning(responseText, totalTokens) {
  if (totalTokens < AI_CONFIG.warnConversationTokens) return responseText;
  if (responseText.includes("This chat is getting long")) return responseText;
  return `${responseText}\n\n---\n\nNote: this chat is getting long. If my replies start missing older details, start a new chat and paste a short summary so I can continue cleanly.`;
}

const TOOL_DEFINITIONS = [
  { name: "getFinancialProfile",  description: "Complete snapshot: net worth, income, expenses, savings rate, emergency fund" },
  { name: "getInvestmentSummary", description: "Portfolio: value, returns, SIP amount, diversification" },
  { name: "getLoanSummary",       description: "Active loans: outstanding, EMIs, rates, debt-to-income ratio" },
  { name: "calculateHealthScore", description: "Financial health score 0-100 with grade, strengths, weaknesses, recommendations" },
  { name: "budgetAnalysis",       description: "Monthly budget: income, expenses by category, savings, savings rate" },
  { name: "goalAnalysis",         description: "Goals: progress %, monthly contribution needed, on-track status" },
  { name: "retirementAnalysis",   description: "Retirement: projected corpus, required corpus, shortfall, extra SIP needed" },
  { name: "riskAnalysis",         description: "Risk profile: score, category, current vs ideal allocation" },
  { name: "emergencyFundCheck",   description: "Emergency fund: amount, months covered, gap from 6-month target" },
  { name: "affordabilityCheck",   description: "Can user afford a specific purchase (one-time or EMI)" },
  { name: "wealthForecast",       description: "Project total wealth over N years" },
  { name: "whatIfSimulator",      description: "Simulate impact of income/expense changes on savings" },
  { name: "loanAdvisor",          description: "Loan payoff strategy: which to clear first, extra payment advice" },
  { name: "investmentAdvisor",    description: "Portfolio advice: current vs recommended allocation, rebalancing" },
  { name: "taxPlanner",           description: "Tax: 80C used/remaining, home loan deduction, total tax saved" },
];

// ── Greetings / small talk (Strict check to prevent misclassifying math or code) ────
const GREETING_EXACT = [
  "hi", "hii", "hiii", "hey", "heyy", "hello", "helo", "namaste", "sup",
  "good morning", "good afternoon", "good evening", "good night",
  "how are you", "how r u", "what's up", "whats up", "wassup",
  "thanks", "thank you", "thx", "ok", "okay", "cool", "great", "nice",
  "bye", "goodbye", "see you", "take care",
];

function isGreeting(query) {
  const clean = (query || "").toLowerCase().trim().replace(/[!?.,]+$/, "");
  if (GREETING_EXACT.includes(clean)) return true;
  if (/^(hi|hey|hello|namaste|good\s+(morning|evening|afternoon))\b/i.test(clean) && clean.split(/\s+/).length <= 4) {
    return true;
  }
  return false;
}

// ── General knowledge patterns ────────────────────────────────────────────────
const GENERAL_KNOWLEDGE_PATTERNS = [
  "what is ", "what are ", "explain ", "how does ", "how do ", "difference between",
  "meaning of ", "who is ", "where is ", "when was ", "why is ", "tell me about",
  "how to ", "steps to ", "guide on ", "tutorial", "best practice", "formula for",
  "calculate ", "write a ", "code ", "function ", "script ", "program ",
  "nifty", "sensex", "rbi", "sebi", "inflation", "gdp", "repo rate",
  "80c", "80d", "new tax regime", "old tax regime", "elss", "ppf", "epf", "nps",
  "sip vs", "mutual fund vs", "term insurance vs", "swp", "stp", "cagr", "xirr",
  "fd vs", "gold vs", "real estate vs", "emergency fund",
];

// ── Patterns that clearly need user's personal data ───────────────────────────
const PERSONAL_DATA_PATTERNS = [
  "my ", "i have", "i earn", "i spend", "my score", "my portfolio", "my loan",
  "my budget", "my goal", "my retirement", "my investment", "my income",
  "my expense", "my savings", "my tax", "my health", "my wealth", "my profile",
  "am i ", "do i ", "can i afford", "can i buy", "should i buy", "will i have enough",
  "how is my", "what is my", "show me my", "analyse my", "analyze my",
];

const PERSONAL_PRONOUN_PATTERNS = [
  /\b(my|mine)\b/,
  /\bi\s+(earn|spend|save|invest|owe|have|hold|pay|need|want)\b/,
];

function isPersonalDataQuery(query) {
  const q = (query || "").toLowerCase().trim();
  return PERSONAL_DATA_PATTERNS.some((p) => q.includes(p)) ||
    PERSONAL_PRONOUN_PATTERNS.some((p) => p.test(q));
}

// ── Classify query type ───────────────────────────────────────────────────────
function isGeneralKnowledge(query) {
  const q = (query || "").toLowerCase().trim();
  if (isPersonalDataQuery(q)) return false;
  return GENERAL_KNOWLEDGE_PATTERNS.some((p) => q.includes(p));
}

// ── Intent → tools map ────────────────────────────────────────────────────────
const INTENT_RULES = [
  { tools: ["retirementAnalysis"],                        patterns: ["my retirement", "retire", "retirement", "pension", "corpus", "will i have enough for retirement", "retire early"] },
  { tools: ["taxPlanner"],                                patterns: ["my tax", "tax planning", "80c", "section 80", "itr", "tds", "tax deduction", "save tax", "24b", "hra"] },
  { tools: ["emergencyFundCheck"],                        patterns: ["emergency fund", "rainy day", "contingency", "safety net", "sudden expense"] },
  { tools: ["loanAdvisor", "getLoanSummary"],             patterns: ["payoff", "pay off", "debt strategy", "which loan", "close loan", "clear debt", "how to repay"] },
  { tools: ["getLoanSummary"],                            patterns: ["my loan", "my emi", "my debt", "my credit", "my liabilities", "outstanding loan"] },
  { tools: ["goalAnalysis"],                              patterns: ["my goal", "am i on track", "goal progress", "saving for", "milestone"] },
  { tools: ["investmentAdvisor", "getInvestmentSummary"], patterns: ["optimize my", "rebalance", "my asset allocation", "portfolio advice"] },
  { tools: ["getInvestmentSummary"],                      patterns: ["my investment", "my portfolio", "my sip", "my returns", "my mutual fund", "my stocks", "my ppf", "my nps"] },
  { tools: ["budgetAnalysis"],                            patterns: ["budget", "monthly budget", "analyse my monthly budget", "analyze my monthly budget", "my spending", "my expenses", "where does my money", "my savings rate", "am i saving", "my income", "my salary"] },
  { tools: ["riskAnalysis"],                              patterns: ["my risk", "my risk profile", "how risky am i"] },
  { tools: ["wealthForecast"],                            patterns: ["my wealth", "how much will i have", "project my", "my forecast", "my future wealth"] },
  { tools: ["affordabilityCheck"],                        patterns: ["can i afford", "can i buy", "should i buy", "is it worth buying"] },
  { tools: ["whatIfSimulator"],                           patterns: ["what if", "if i get a raise", "if my income", "if i reduce", "simulate"] },
  { tools: ["calculateHealthScore"],                      patterns: ["my health score", "my financial health", "how am i doing", "my grade", "my score", "financial fitness"] },
  { tools: ["getFinancialProfile"],                       patterns: ["my net worth", "my profile", "my overview", "my balance sheet", "my total assets", "how are my finances", "about my finances", "about my finance", "my finance", "my finances", "my financial", "my money"] },
];

// Returns matched tools, or null if no intent matched
function classifyIntents(query) {
  const q = (query || "").toLowerCase().trim();
  for (const rule of INTENT_RULES) {
    for (const pattern of rule.patterns) {
      if (q.includes(pattern)) return rule.tools;
    }
  }
  // No specific intent matched — return null (caller will treat as general)
  return null;
}

// ── Parameter extraction ──────────────────────────────────────────────────────
function extractParams(query, toolName) {
  const q = (query || "").toLowerCase();
  if (toolName === "affordabilityCheck") {
    const crore = q.match(/(\d+(?:\.\d+)?)\s*(?:cr(?:ore)?)/);
    const lakh  = q.match(/(\d+(?:\.\d+)?)\s*(?:l(?:akh)?|lac)/);
    const plain = q.match(/(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)/);
    let amount = 0;
    if (crore)      amount = parseFloat(crore[1]) * 10_000_000;
    else if (lakh)  amount = parseFloat(lakh[1]) * 100_000;
    else if (plain) amount = parseFloat(plain[1].replace(/,/g, ""));
    return { amount: amount || 100_000, type: q.includes("emi") || q.includes("installment") ? "emi" : "one_time" };
  }
  if (toolName === "wealthForecast") {
    const m = q.match(/(\d+)\s*(?:year|yr)/);
    return { years: m ? parseInt(m[1]) : 10 };
  }
  if (toolName === "whatIfSimulator") {
    const inc   = q.match(/income.*?(\d[\d,]*)/);
    const exp   = q.match(/expense.*?(\d[\d,]*)/);
    const raise = q.match(/(?:raise|hike|increment).*?(\d[\d,]*)/);
    const p = (m) => m ? parseFloat(m[1].replace(/,/g, "")) : 0;
    return { incomeChange: p(inc) || p(raise), expenseChange: p(exp) };
  }
  return {};
}

// ── Execute tool safely ───────────────────────────────────────────────────────
async function executeTool(toolName, params, userId) {
  const fn = tools[toolName];
  if (!fn) return { error: `Tool "${toolName}" not found` };
  try {
    if (toolName === "affordabilityCheck") return await fn(userId, params.amount || 100_000, params.type || "one_time");
    if (toolName === "wealthForecast")     return await fn(userId, params.years || 10);
    if (toolName === "whatIfSimulator")    return await fn(userId, params);
    return await fn(userId);
  } catch (err) {
    console.error(`Tool "${toolName}" error:`, err.message);
    return { error: err.message };
  }
}

// ── Formatters ────────────────────────────────────────────────────────────────
function fmt(val) {
  const n = parseFloat(val) || 0;
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000)    return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
function pct(val) { return `${(parseFloat(val) || 0).toFixed(1)}%`; }
function n(val)   { return parseFloat(val) || 0; }

function buildFallbackResponse(toolName, data) {
  if (!data || data.error) {
    if ((data?.error || "").includes("retirement plan"))
      return "⚠️ No retirement plan found. Please add your details in **Settings → Retirement Planning**.";
    return `⚠️ ${data?.error || "No data found"}. Please complete your financial profile in **Settings**.`;
  }
  switch (toolName) {
    case "calculateHealthScore": {
      const score = n(data.score || data.overallScore);
      const bar = "█".repeat(Math.round(score / 10)).padEnd(10, "░");
      return `## 🏥 Financial Health: **${score.toFixed(score % 1 ? 1 : 0)}/100 — Grade ${data.grade || "N/A"}**
\`${bar}\`

**✅ Strengths:**
${(data.strengths || []).map(s => `• ${s}`).join("\n") || "• Add financial data to see strengths"}

**⚠️ Areas to improve:**
${(data.weaknesses || []).map(w => `• ${w}`).join("\n") || "• Complete your profile for analysis"}

**💡 Recommendations:**
${(data.recommendations || []).map((r, i) => `${i + 1}. ${r}`).join("\n") || "1. Complete your financial profile to get personalised recommendations"}`;
    }
    case "budgetAnalysis": {
      const inc = n(data.income || data.monthlyIncome);
      const exp = n(data.expenses || data.monthlyExpense);
      const sav = n(data.savings || data.monthlySavings);
      const rate = n(data.savingsRate);
      if (!inc) return "⚠️ No income records found. Please add your income in **Settings → Income**.";
      const cats = Object.entries(data.categoryBreakdown || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5).map(([c, v]) => `• ${c}: ${fmt(v)}`).join("\n");
      return `## Monthly Budget

**Income:** ${fmt(inc)}
**Expenses:** ${fmt(exp)}
**Savings:** ${fmt(sav)}
**Savings rate:** ${pct(rate)}

${rate < 10 ? "⚠️ Savings rate critically low." : rate < 20 ? "⚠️ Aim for at least 20% savings rate." : "✅ Great savings discipline!"}
${cats ? `\n**Top expense categories:**\n${cats}` : ""}`;
    }
    case "riskAnalysis": {
      const score = n(data.score || data.riskScore);
      const alloc = data.allocation || {};
      const factors = data.factors || {};
      return `## Risk Profile: **${data.category || data.riskCategory || "N/A"}**

**Risk score:** ${score}/100
**Equity:** ${pct(alloc.equity)}
**Debt:** ${pct(alloc.debt)}
**Alternative:** ${pct(alloc.alternative)}
**Debt ratio:** ${pct(factors.debtRatio)}
**Emergency coverage:** ${n(factors.emergencyCoverage).toFixed(1)} months

${score >= 70 ? "Your profile is growth-oriented, but make sure to maintain an adequate emergency fund for resilience." : "Your risk profile is balanced. Maintain steady diversification across assets."}`;
    }
    case "getInvestmentSummary": {
      const p = data.portfolio || {};
      if (!n(p.currentValue) && !n(p.totalInvested)) return "⚠️ No investments found. Add your investments in **Settings → Investments**.";
      return `## Investment Portfolio

**Portfolio value:** ${fmt(p.currentValue)}
**Total invested:** ${fmt(p.totalInvested)}
**Returns:** ${fmt(p.returns)} (${pct(p.returnPct)})
**Monthly SIP:** ${fmt(data.monthlySIP)}
**Diversification:** ${data.diversification || "—"}`;
    }
    case "getLoanSummary": {
      if (!n(data.totalLoans)) return "🎉 **No active loans!** You are completely debt-free.";
      const loans = (data.loans || []).map(l => `• **${l.type}** — ${fmt(l.outstanding)} @ ${pct(l.rate)} | EMI: ${fmt(l.emi)}`).join("\n");
      return `## Loans

**Active loans:** ${data.totalLoans}
**Total outstanding:** ${fmt(data.totalOutstanding)}
**Monthly EMI:** ${fmt(data.totalEMI)}
**Debt-to-income:** ${pct(data.debtToIncomeRatio)}

${loans}`;
    }
    case "goalAnalysis": {
      if (!(data.goals || []).length) return "📌 No goals found. Add goals in **Settings → Goals**.";
      return `## 🎯 Goals — ${data.onTrack}/${data.totalGoals} on track\n\n${data.goals.map(g =>
        `**${g.name}** ${g.status === "on_track" ? "✅" : "⚠️"} — ${pct(g.progress)} complete\nNeed ${fmt(g.monthlyNeeded)}/month`
      ).join("\n\n")}`;
    }
    case "retirementAnalysis": {
      const gap = n(data.gap);
      return `## Retirement

**Projected corpus:** ${fmt(data.projectedCorpus)}
**Required corpus:** ${fmt(data.requiredCorpus)}

${data.sufficient ? `✅ On track! Surplus: ${fmt(Math.abs(gap))}` : `⚠️ Shortfall: **${fmt(Math.abs(gap))}**\n💡 Increase SIP by **${fmt(data.additionalSIPNeeded)}/month**.`}`;
    }
    case "emergencyFundCheck": {
      const cov = n(data.coverage || data.coverageMonths);
      return `## 🛡️ Emergency Fund\n\n| | |\n|---|---|\n| Current | **${fmt(data.currentAmount)}** |\n| Target (6 months) | ${fmt(data.targetAmount)} |\n| Coverage | ${cov.toFixed(1)} months |\n\n${data.sufficient ? "✅ Adequate!" : `⚠️ Gap: **${fmt(data.gap)}** — Save ${fmt(n(data.gap) / 12)}/month.`}`;
    }
    case "taxPlanner": {
      const d = data.deductions || {};
      return `## 🧾 Tax Planning\n\n| | Amount |\n|---|---|\n| Annual Income | ${fmt(data.annualIncome)} |\n| 80C Invested | ${fmt(d.section80C)} |\n| 80C Remaining | **${fmt(d.remaining80C)}** |\n| Tax Saved | **${fmt(data.taxSaved || data.taxSaving)}** |\n\n${n(d.remaining80C) > 0 ? `💡 Invest **${fmt(d.remaining80C)} more** in ELSS/PPF/NPS to save another **${fmt(n(d.remaining80C) * 0.3)}**.` : "✅ 80C limit fully utilised!"}`;
    }
    case "wealthForecast": {
      const cw = n(data.currentWealth), pw = n(data.projectedWealth);
      if (!cw && !pw) return "⚠️ No investment data found. Add investments in **Settings** for a forecast.";
      return `## 🚀 Wealth Forecast — ${data.years} Years\n\n| | Amount |\n|---|---|\n| Current | ${fmt(cw)} |\n| Projected | **${fmt(pw)}** |\n\n💡 Consistent SIP compounding at ${data.growthRate || 12}% p.a.`;
    }
    case "affordabilityCheck": {
      const d = data.details || data;
      return `## 🛒 Affordability\n\n${data.canAfford ? "✅ **Yes, you can afford this!**" : "❌ **This may be a stretch.**"}\n\n${data.recommendation || d.recommendation || ""}`;
    }
    case "whatIfSimulator": {
      const b = data.baseline || {}, m = data.modified || {}, im = data.impact || {};
      return `## 🔮 What-If Scenario\n\n| | Before | After |\n|---|---|---|\n| Income | ${fmt(b.income)} | ${fmt(m.income)} |\n| Expenses | ${fmt(b.expense)} | ${fmt(m.expense)} |\n| Savings | ${fmt(b.savings)} | **${fmt(m.savings)}** |\n\n${n(im.savingsChange) >= 0 ? "📈" : "📉"} Change: **${fmt(Math.abs(n(im.savingsChange)))}/month**`;
    }
    case "loanAdvisor": {
      if (!(data.loans || []).length) return "🎉 No active loans — you're debt-free!";
      return `## 🏦 Loan Strategy\n\n**${data.strategy}**\n\n${data.loans.map((l, i) => `${i + 1}. **${l.type}** — ${fmt(l.outstanding)} @ ${pct(l.rate)} · ${l.priority} priority`).join("\n")}\n\n💡 Extra **${fmt(data.extraPayment)}/month** on highest-rate loan.`;
    }
    case "investmentAdvisor": {
      const cur = data.current || {}, rec = data.recommended || {};
      const ca = cur.allocation || {}, ra = rec.allocation || {};
      if (!n(cur.portfolio)) return "⚠️ No investment data. Add investments in **Settings → Investments**.";
      return `## 📈 Investment Advice\n\n**Portfolio:** ${fmt(cur.portfolio)} · Returns: ${pct(cur.returns)}\n\n| Asset | Current | Recommended |\n|---|---|---|\n| Equity | ${pct(ca.equity)} | ${pct(ra.equity)} |\n| Debt | ${pct(ca.debt)} | ${pct(ra.debt)} |\n\n💡 ${rec.reasoning || "Rebalance based on your risk profile."}`;
    }
    case "getFinancialProfile": {
      const nw = data.netWorth || {}, mo = data.monthly || {}, ef = data.emergencyFund || {};
      if (!n(mo.income) && !n(nw.total)) return "⚠️ Your profile is empty. Please complete it in **Settings** — add income, expenses, investments, and loans.";
      return `## Financial Overview\n\n**Net worth:** ${fmt(nw.total)}\n**Monthly income:** ${fmt(mo.income)}\n**Monthly expenses:** ${fmt(mo.expense)}\n**Monthly savings:** ${fmt(mo.savings)}\n**Savings rate:** ${pct(mo.savingsRate)}\n**Emergency fund:** ${n(ef.coverage).toFixed(1)} months`;
    }
    default:
      return `Data:\n\`\`\`\n${JSON.stringify(data, null, 2).slice(0, 1000)}\`\`\``;
  }
}

// ── Multi-Domain Offline Brain (Finance, Math, Coding, Science & Knowledge) ───
function getGeneralKnowledgeFallback(query = "") {
  const q = String(query).toLowerCase().trim();

  // 1. Math / Percentages / Arithmetic Evaluator
  const pctMatch = q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of)\s*(\d+(?:\.\d+)?)/);
  if (pctMatch) {
    const p = parseFloat(pctMatch[1]);
    const total = parseFloat(pctMatch[2]);
    const res = (p / 100) * total;
    return `### 🧮 Calculation Result\n\n**${p}% of ${total.toLocaleString("en-IN")}** = **${res.toLocaleString("en-IN")}**\n\n*Formula:* \`(${p} / 100) × ${total} = ${res}\``;
  }

  const basicMath = q.match(/^(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)$/);
  if (basicMath) {
    const a = parseFloat(basicMath[1]);
    const op = basicMath[2];
    const b = parseFloat(basicMath[3]);
    let ans = 0;
    if (op === "+") ans = a + b;
    if (op === "-") ans = a - b;
    if (op === "*") ans = a * b;
    if (op === "/") ans = b !== 0 ? a / b : "Infinity (division by zero)";
    return `### 🧮 Calculation Result\n\n\`${a} ${op} ${b} = ${ans}\``;
  }

  // 2. Rule of 72
  if (/rule of 72/i.test(q)) {
    return `### ⏱️ The Rule of 72: Doubling Time of Money\n\nThe **Rule of 72** estimates how many years it will take for an investment to double at a given annual return rate:\n\n$$\\text{Years to Double} \\approx \\frac{72}{\\text{Annual Return Rate (\\%)}}$$\n\n**Examples:**\n• At **12% p.a.** (Equity/Mutual Funds) $\\rightarrow 72 / 12 =$ **6 years to double**.\n• At **8% p.a.** (Fixed Income/EPF) $\\rightarrow 72 / 8 =$ **9 years to double**.\n• At **6% p.a.** (Savings/FD) $\\rightarrow 72 / 6 =$ **12 years to double**.`;
  }

  // 3. Indian Finance & Tax Topics
  if (/sip|systematic investment/i.test(q)) {
    return `### 📈 Systematic Investment Plan (SIP)

A **SIP (Systematic Investment Plan)** allows you to invest a fixed amount regularly (monthly or weekly) in mutual funds.

**Key Benefits:**
• **Rupee Cost Averaging**: You buy more units when markets are down and fewer when markets are up, averaging your purchase cost.
• **Power of Compounding**: Regular monthly investments of ₹10,000 for 15 years @ 12% p.a. grow to **~₹50.45 Lakhs** (total invested: ₹18 Lakhs).
• **Discipline**: Automated investing removes emotion from volatile markets.

💡 *Try our interactive SIP & Lumpsum Calculator on the **Calculators** page to simulate your returns.*`;
  }

  if (/tax|80c|80d|old regime|new regime|deduction|save tax|capital gain|ltcg|stcg/i.test(q)) {
    return `### 🧾 Indian Tax Planning Guide (FY 2024-25 / AY 2025-26)

**New Tax Regime (Default):**
• Zero tax up to ₹7.75 Lakhs (with Standard Deduction of ₹75,000 and rebate u/s 87A).
• Lower slab rates, but deductions like 80C, 80D, and HRA are not allowed.

**Old Tax Regime (Optional):**
• **Section 80C**: Save up to ₹1.5 Lakhs across ELSS Mutual Funds, PPF, EPF, NPS, and Term Insurance.
• **Section 80D**: Up to ₹25,000 for self/family health insurance + ₹50,000 for senior citizen parents.
• **Section 80CCD(1B)**: Additional ₹50,000 deduction exclusively for NPS.

**Capital Gains Taxes (Budget 2024-25 Update):**
• **LTCG (Listed Equity)**: 12.5% on gains exceeding ₹1.25 Lakhs per financial year.
• **STCG (Listed Equity)**: 20% flat tax on equity held for under 12 months.`;
  }

  if (/emergency fund|contingency fund|liquid/i.test(q)) {
    return `### 🛡️ Emergency Fund Essentials

An emergency fund protects you from job loss, medical emergencies, or unforeseen home/auto repairs without liquidating investments.

**Golden Rules:**
1. **Target**: Maintain **6 to 12 months** of mandatory monthly expenses (Rent/EMI + Utilities + Groceries + Insurance).
2. **Where to Park**: 
   • 50% in High-Yield Savings Account / Liquid Mutual Funds (instant liquidity).
   • 50% in Sweeping / Short-Term Fixed Deposits (FD).
3. **Never Invest in Equity**: Emergency funds must have zero capital risk.`;
  }

  if (/50[\/\-]30[\/\-]20|budget rule|how to budget/i.test(q)) {
    return `### 📊 The 50/30/20 Budgeting Rule

The most effective rule of thumb for monthly income allocation:

• **50% Needs**: Mandatory living expenses (Rent, EMIs, Groceries, Utilities, Basic Insurance).
• **30% Wants**: Discretionary lifestyle spending (Dining out, Entertainment, Subscriptions, Vacations).
• **20% Savings & Investments**: Wealth creation (SIPs, Emergency Fund, Retirement, Debt Prepayment).

💡 *If you have high-interest debt, consider adjusting to 50% Needs, 20% Wants, and 30% Debt/Savings.*`;
  }

  if (/insurance|term insurance|health insurance/i.test(q)) {
    return `### 🛡️ Insurance Strategy: Pure Protection

1. **Term Life Insurance**:
   • Sum assured should be **10x to 15x your annual income**.
   • Choose a pure term plan with regular pay up to age 60-65. Avoid ULIPs or endowment policies.
2. **Health Insurance**:
   • Minimum ₹10 Lakhs to ₹25 Lakhs individual/family floater with a super top-up policy.
   • Don't rely solely on employer group insurance.

💡 *Check your insurance coverage gap on our **Insurance Gap Checker** page.*`;
  }

  if (/(?:how to invest in|what is|allocation in|best|basics of)\s+(?:mutual fund|index fund|large cap|small cap|equity fund|equity allocation)/i.test(q) || /^(mutual fund|index fund|large cap|small cap)$/i.test(q)) {
    return `### 📊 Mutual Fund & Equity Allocation Strategy

• **Beginners**: Start with Low-Cost **Nifty 50 Index Funds** or **Nifty LargeMidcap 250** funds.
• **Core Portfolio**: 60-70% Large Cap / Index Funds + 20-30% Mid Cap / Flexi Cap + 10% Small Cap.
• **Horizon**: Keep equity investments for a minimum 5-7 year timeframe to ride out market cycles.
• **Direct vs Regular**: Always choose **Direct Growth** plans to save 1-1.5% in annual distributor commissions.`;
  }

  if (/gold|sgb|sovereign gold/i.test(q)) {
    return `### 🪙 Gold Allocation & Strategy

• **Ideal Allocation**: 5% to 10% of your total investment portfolio as a hedge against inflation and currency depreciation.
• **Best Instruments**:
  1. **Gold ETFs / Mutual Funds**: High liquidity, low tracking error, trades on NSE/BSE.
  2. **Physical Gold**: Surcharge of making charges (8-25%) and storage risks.
  3. **Digital Gold**: Subject to 3% GST and spread fees; ETFs are preferred for pure investment.`;
  }

  if (/debt payoff|snowball|avalanche|close loan/i.test(q)) {
    return `### 💳 Debt Payoff Strategies: Avalanche vs Snowball

1. **Debt Avalanche (Mathematically Optimal)**:
   • Pay minimums on all loans.
   • Put all extra money toward the loan with the **highest interest rate** (e.g. Credit Cards @ 36-42%, then Personal Loans @ 12-16%).
   • Saves the most money in interest.

2. **Debt Snowball (Psychological Momentum)**:
   • Pay minimums on all loans.
   • Attack the loan with the **smallest balance first**, regardless of rate.
   • Builds quick confidence as loans get closed one by one.`;
  }

  // 4. Algorithms, Data Structures & Coding Fallbacks
  if (/linked list|reverse.*list/i.test(q)) {
    return `### 🐍 Python: Reverse a Linked List

Here is the standard iterative solution ($O(n)$ time, $O(1)$ space):

\`\`\`python
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def reverse_linked_list(head: ListNode) -> ListNode:
    prev = None
    curr = head
    while curr:
        next_node = curr.next  # store next pointer
        curr.next = prev       # reverse pointer
        prev = curr            # advance prev
        curr = next_node       # advance curr
    return prev
\`\`\`

**Complexity:**
• **Time Complexity**: $O(n)$ where $n$ is the number of nodes.
• **Space Complexity**: $O(1)$ in-place reversal.`;
  }

  if (/fibonacci/i.test(q)) {
    return `### 🔢 Fibonacci Generator in Python

\`\`\`python
def fibonacci(n: int):
    """Generate first n Fibonacci numbers."""
    if n <= 0:
        return []
    sequence = [0, 1]
    while len(sequence) < n:
        sequence.append(sequence[-1] + sequence[-2])
    return sequence[:n]

# Example: first 10 numbers
print(fibonacci(10))  # [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\``;
  }

  if (/palindrome/i.test(q)) {
    return `### 🔤 Palindrome Check in Python & JavaScript

**Python:**
\`\`\`python
def is_palindrome(s: str) -> bool:
    clean = ''.join(c.lower() for c in s if c.isalnum())
    return clean == clean[::-1]
\`\`\`

**JavaScript / TypeScript:**
\`\`\`typescript
function isPalindrome(str: string): boolean {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === clean.split('').reverse().join('');
}
\`\`\``;
  }

  if (/quantum|entanglement|quantum computing/i.test(q)) {
    return `### ⚛️ Quantum Entanglement Explained Simply

**Quantum entanglement** is a phenomenon in physics where two or more particles become interconnected such that the quantum state of one particle instantly dictates the state of the other, regardless of the distance separating them.

**Key Concepts:**
1. **Superposition**: Before measurement, a quantum particle exists in a probability cloud of multiple states simultaneously (both 0 and 1).
2. **Instant Correlation**: When you measure the spin of particle A (say, Spin Up), particle B immediately assumes the opposite state (Spin Down), even if they are light-years apart.
3. **Einstein's Reaction**: Albert Einstein famously called this *"spooky action at a distance"* because it seemed to violate the principle that nothing travels faster than light.
4. **Modern Application**: Powers quantum encryption (QKD), quantum computing (qubit operations), and ultra-secure communications.`;
  }

  if (/transformer|llm|neural network|machine learning|artificial intelligence|ai work/i.test(q)) {
    return `### 🧠 How Modern AI & Transformers Work

Modern Large Language Models (LLMs) are built on the **Transformer Architecture** introduced in the 2017 paper *"Attention Is All You Need"*:

1. **Tokenization**: Text is split into sub-word tokens (words or syllables converted to integer IDs).
2. **Vector Embeddings**: Each token is converted into a high-dimensional vector capturing semantic meaning.
3. **Self-Attention Mechanism**: Allows the model to weigh the relevance of every word in a sentence against every other word, understanding context and long-range dependencies.
4. **Feed-Forward Layers & Generation**: Computes probability distributions over the vocabulary to predict the most likely next token sequentially.`;
  }

  // 5. General Tech / Software Engineering
  if (/python|javascript|react|node|docker|sql|api|coding|git/i.test(q)) {
    return `### 💻 Tech & Engineering Knowledge

I am fully capable of writing code, debugging, architecture design, and system optimization across multiple stacks:
• **Languages**: JavaScript, TypeScript, Python, SQL, Rust, C++, Go.
• **Frameworks**: React, Next.js, Node.js, Express, FastAPI, Django.
• **Infrastructure**: Docker, PostgreSQL, Redis, Nginx, CI/CD, Microservices.

Feel free to paste your code, error message, or system design problem, and I'll break it down with step-by-step solutions!`;
  }

  return `### 💡 SmartFinance AI Omnipresent Assistant

I can assist you with comprehensive insights across:
• **Personal Finance & Wealth**: Net worth, budgeting, SIP compounding, health score, tax planning, and loans.
• **Mathematics & Analytics**: Compounding calculations, EMI forecasting, statistical analysis, and formulas.
• **Coding & Technology**: Full-stack engineering, debugging, API design, algorithms, and database optimization.
• **General Knowledge & Strategy**: Research, business planning, career advice, and conceptual explanations.

Feel free to ask your question in detail!`;
}

// ── Call Gemini ───────────────────────────────────────────────────────────────
const FALLBACK_MODELS = [
  process.env.GEMINI_MODEL_CHAT,
  DEFAULT_CHAT_MODEL,
  "gemini-1.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
  "gemini-2.0-flash-lite",
].filter(Boolean).filter((model, index, list) => list.indexOf(model) === index);

function isOverloadedError(err) {
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("503") || msg.includes("overloaded") || msg.includes("high demand") || msg.includes("unavailable");
}

function isAuthError(err) {
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("401") || msg.includes("unauthorized") || msg.includes("invalid authentication") || msg.includes("access_token_type_unsupported") || msg.includes("api_key_invalid");
}

function isModelUnavailableError(err) {
  const msg = (err?.message || "").toLowerCase();
  return msg.includes("404") || msg.includes("not_found") || msg.includes("no longer available") || msg.includes("not found");
}

function isQuotaErrorMessage(msg = "") {
  const text = String(msg).toLowerCase();
  return text.includes("429") || text.includes("quota") || text.includes("too_many_requests") || text.includes("rate limit") || text.includes("resource_exhausted");
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Multi-Provider Unified LLM Caller ─────────────────────────────────────────
async function callUnifiedLLM(prompt, systemPrompt = AI_CONFIG.systemPrompt, history = []) {
  // 1. Try Groq (100% Free, blazing fast Llama 3.3 70B: https://console.groq.com/keys)
  if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.startsWith("gsk_")) {
    const groqRes = await callGroq(prompt, systemPrompt, history);
    if (groqRes && groqRes.trim().length > 10) return groqRes.trim();
  }

  // 2. Try Gemini (Free on Google AI Studio: https://aistudio.google.com/app/apikey)
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.startsWith("AIzaSy")) {
    const geminiRes = await callGeminiGrounded(prompt);
    if (geminiRes && geminiRes.trim().length > 10) return geminiRes.trim();
    const chatRes = await callGemini(prompt, history);
    if (chatRes && chatRes.trim().length > 10) return chatRes.trim();
  }

  // 3. Try OpenRouter (Free community models: https://openrouter.ai/keys)
  if (process.env.OPENROUTER_API_KEY && process.env.OPENROUTER_API_KEY.startsWith("sk-or-")) {
    const orRes = await callOpenRouter(prompt, systemPrompt, history);
    if (orRes && orRes.trim().length > 10) return orRes.trim();
  }

  // 4. Try Local Ollama (100% Free Offline: http://localhost:11434)
  if (process.env.OLLAMA_BASE_URL || process.env.OLLAMA_MODEL) {
    const ollamaRes = await callOllama(prompt, systemPrompt, history);
    if (ollamaRes && ollamaRes.trim().length > 10) return ollamaRes.trim();
  }

  return null;
}

async function callGemini(prompt, history = []) {
  if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.startsWith("AIzaSy")) return null;

  for (let i = 0; i < FALLBACK_MODELS.length; i++) {
    const modelName = FALLBACK_MODELS[i];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const model = getModel(AI_CONFIG.systemPrompt, modelName);
        if (!model) continue;
        const geminiChat = model.startChat({ history });
        const result = await geminiChat.sendMessage(prompt);
        const text = result?.response?.text?.();
        if (text && text.trim().length > 10) return text.trim();
      } catch (err) {
        console.warn(`Gemini error (model=${modelName}, attempt=${attempt + 1}):`, err.message || err);
        if (isAuthError(err)) return null; // Invalid API key: immediately fail over to offline engine
        const overloaded = isOverloadedError(err);
        const modelUnavailable = isModelUnavailableError(err);
        if (modelUnavailable) break; // Try next fallback model immediately
        if (attempt === 0 && (overloaded || isQuotaErrorMessage(err.message))) {
          await sleep(500); // brief backoff before retry
        } else {
          break; // Move to next model
        }
      }
    }
  }
  return null; // All models exhausted
}

function extractGroundedText(interaction) {
  if (interaction?.output_text) return interaction.output_text;
  if (interaction?.outputText) return interaction.outputText;
  if (interaction?.text) return interaction.text;

  const candidateParts = interaction?.candidates?.[0]?.content?.parts || [];
  const candidateText = candidateParts
    .map(part => part?.text)
    .filter(Boolean)
    .join("\n\n")
    .trim();
  if (candidateText) return candidateText;

  const texts = [];
  for (const step of interaction?.steps || []) {
    if (step.type !== "model_output") continue;
    for (const block of step.content || []) {
      if (block.type === "text" && block.text) texts.push(block.text);
      if (block.text && !block.type) texts.push(block.text);
    }
  }
  return texts.join("\n\n").trim();
}

function extractGroundedCitations(interaction) {
  const seen = new Set();
  const citations = [];

  function addCitation(title, url) {
    if (!url || seen.has(url)) return;
    seen.add(url);
    citations.push({ title: title || url, url });
  }

  for (const step of interaction?.steps || []) {
    if (step.type !== "model_output") continue;
    for (const block of step.content || []) {
      for (const annotation of block.annotations || []) {
        if (annotation.type !== "url_citation" || !annotation.url) continue;
        addCitation(annotation.title, annotation.url);
      }
    }
  }

  const groundingChunks = interaction?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  for (const chunk of groundingChunks) {
    addCitation(chunk?.web?.title, chunk?.web?.uri);
  }

  return citations;
}

function withSources(text, citations) {
  if (!text || !citations?.length) return text;
  const sourceList = citations
    .slice(0, 5)
    .map((c, i) => `${i + 1}. [${c.title}](${c.url})`)
    .join("\n");
  return `${text.trim()}\n\n**Sources**\n${sourceList}`;
}

async function callGeminiGrounded(prompt) {
  if (!process.env.GEMINI_API_KEY || typeof fetch !== "function") return null;

  const models = [
    process.env.GEMINI_MODEL_GROUNDED,
    process.env.GEMINI_MODEL_CHAT,
    DEFAULT_CHAT_MODEL,
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
  ].filter(Boolean).filter((model, index, list) => list.indexOf(model) === index);

  async function postGemini(url, body, model, label) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.error?.message || `HTTP ${res.status}`;
      console.warn(`Gemini grounded ${label} error (model=${model}):`, msg);
      return { ok: false, status: res.status, message: msg };
    }

    return { ok: true, json };
  }

  for (const model of models) {
    try {
      const interaction = await postGemini("https://generativelanguage.googleapis.com/v1beta/interactions", {
        model,
        input: prompt,
        tools: [{ type: "google_search" }],
      }, model, "interactions");

      if (interaction.ok) {
        const text = extractGroundedText(interaction.json);
        if (text && text.length >= 10) return withSources(text, extractGroundedCitations(interaction.json));
      } else {
        if (interaction.status === 401 || isAuthError({ message: interaction.message })) return null;
        if (interaction.status === 429 || isQuotaErrorMessage(interaction.message)) {
          return null; // fall back to regular chat or offline knowledge
        }
      }

      const generated = await postGemini(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
      }, model, "generateContent");

      if (!generated.ok) {
        if (generated.status === 401 || isAuthError({ message: generated.message })) return null;
        if (generated.status === 429 || isQuotaErrorMessage(generated.message)) {
          return "Gemini Search is connected, but this API key has exceeded its current quota/rate limit. Please check billing or quota in Google AI Studio, then try again.";
        }
        if (generated.status === 404 || /no longer available|not_found|not found/i.test(generated.message)) continue;
        return null;
      }

      const text = extractGroundedText(generated.json);
      if (text && text.length >= 10) {
        return withSources(text, extractGroundedCitations(generated.json));
      }

      console.error(`Gemini grounded returned no usable text (model=${model})`);
    } catch (err) {
      console.error(`Gemini grounded request error (model=${model}):`, err.message);
      return null;
    }
  }

  return null;
}

// ── Generate a clean conversation title (Zero-API for short messages) ───────
async function generateTitle(message) {
  const clean = String(message || "").trim();
  if (clean.length <= 40) {
    return clean.replace(/[!?.,]+$/, "");
  }

  // If long message and API key is present, generate a smart title
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = `Generate a short, clean title (max 5 words, no quotes, no trailing punctuation) for: "${clean.substring(0, 150)}"`;
      const title = await callGemini(prompt, []);
      if (title) {
        const cleaned = title.trim().replace(/^["']|["']$/g, "").split("\n")[0];
        if (cleaned.length > 0 && cleaned.length <= 50) return cleaned;
      }
    } catch {
      // ignore
    }
  }

  // Fallback: clean word boundary truncation
  const truncated = clean.substring(0, 45);
  const lastSpace = truncated.lastIndexOf(" ");
  const base = lastSpace > 15 ? truncated.substring(0, lastSpace) : truncated;
  return base + "…";
}

// ── Main chat function ────────────────────────────────────────────────────────
async function chat(userId, message, conversationId = null) {
  try {
    // 1. Conversation management
    let conversation;
    if (conversationId) {
      conversation = await AIConversation.findById(conversationId);
      if (!conversation || conversation.userId !== userId)
        return { error: "Conversation not found or unauthorised." };
    } else {
      const title = await generateTitle(message);
      conversation = await AIConversation.create(userId, title);
      conversationId = conversation.id;
    }

    // 2. Store user message. Count rough tokens for conversation-size limits.
    await AIMessage.create({
      conversationId,
      role: "user",
      content: message,
      totalTokens: estimateTokens(message),
    });

    // 3. Load history and build a bounded memory window for Gemini.
    const allMessages = await AIMessage.findByConversationId(conversationId);
    const totalConversationTokens = conversationTokenEstimate(allMessages);

    if (totalConversationTokens >= AI_CONFIG.maxConversationTokens) {
      const responseText = buildConversationLimitMessage(totalConversationTokens, allMessages.length);
      const assistantMsg = await AIMessage.create({
        conversationId,
        role: "assistant",
        content: responseText,
        totalTokens: estimateTokens(responseText),
      });

      return {
        conversationId,
        messageId: assistantMsg.id,
        content: responseText,
        contextLimitReached: true,
      };
    }

    const memory = buildGeminiHistory(allMessages);
    const geminiHistory = memory.history;

    const normalizedKey = queryCache.normalizeKey(message);
    let responseText = "";

    // ── Tier 1: Check In-Memory LRU Cache (0 API calls, <1ms) ────────────────
    if (!isPersonalDataQuery(message)) {
      const cached = queryCache.get(normalizedKey);
      if (cached) responseText = cached;
    }

    // ── Tier 2: Instant Casual / Small Talk / Capabilities (0 API calls, <1ms)
    if (!responseText) {
      const casual = getInstantCasualResponse(message);
      if (casual) responseText = casual;
    }

    // ── Tier 3: High-Precision Financial Math & EMI/SIP Solver (0 API calls) ─
    if (!responseText) {
      const mathAnswer = solveFinancialMath(message);
      if (mathAnswer) {
        responseText = mathAnswer;
        queryCache.set(normalizedKey, mathAnswer);
      }
    }

    // ── Tier 3.5: Real-Time Live Stock & Market Quotes (<300ms, Live Feed) ──
    if (!responseText && !isPersonalDataQuery(message)) {
      const liveQuote = await getLiveStockQuote(message);
      if (liveQuote?.markdown) {
        responseText = liveQuote.markdown;
      }
    }

    // ── Tier 4: Curated Top Financial FAQs & Rules (0 API calls) ────────────
    if (!responseText && !isPersonalDataQuery(message)) {
      const faqAnswer = getFrequentFinanceResponse(message);
      if (faqAnswer) {
        responseText = faqAnswer;
        queryCache.set(normalizedKey, faqAnswer);
      }
    }

    // ── Tier 5: Personal Financial Data or Deep Universal Reasoning ──────────
    if (!responseText) {
      if (!isPersonalDataQuery(message) || isGeneralKnowledge(message)) {
        // Universal / open-ended queries
        // Check for real-time web & market context grounding
        const liveContext = await getLiveGroundingContext(message);

        const generalPrompt = `USER QUESTION: "${message}"

${liveContext ? `### REAL-TIME WEB & LIVE MARKET CONTEXT (Live as of today):\n${liveContext}\n\n` : ""}INSTRUCTIONS:
- Answer the user's question with clarity, expertise, and precision.
- If real-time web/market context is provided above, incorporate those live facts seamlessly to provide an accurate, up-to-date response.
- If this is a coding or technical problem, provide clean, idiomatic code examples with concise explanations.
- If this is a math, science, or logic problem, show the clear step-by-step solution.
- If this is an Indian finance, taxation, or market concept, give practical, actionable insights.
- For open knowledge or general advice, use clean markdown structure (headers, bullet points, bold highlights) and match the user's requested depth.`;

        responseText = await callUnifiedLLM(generalPrompt, AI_CONFIG.systemPrompt, geminiHistory);
        if (!responseText) responseText = getGeneralKnowledgeFallback(message);

        // Cache general responses so identical queries never hit API again
        if (responseText) {
          queryCache.set(normalizedKey, responseText);
        }

      } else {
        // ── Personal data: run tools and answer based on real data ────────────
        const toolNames = classifyIntents(message);

        const COMPREHENSIVE_TOOLS = [
          "getFinancialProfile",
          "calculateHealthScore",
          "getInvestmentSummary",
          "getLoanSummary",
          "goalAnalysis",
          "budgetAnalysis",
          "riskAnalysis",
        ];
        const effectiveToolNames = toolNames || COMPREHENSIVE_TOOLS;
        const isComprehensive = !toolNames;

        const toolResults = await Promise.all(
          effectiveToolNames.map(async (toolName) => {
            const params = extractParams(message, toolName);
            const result = await executeTool(toolName, params, userId);
            return { toolName, params, result };
          })
        );

        const dataContext = toolResults
          .map(({ toolName, result }) => `### ${toolName}:\n${JSON.stringify(result, null, 2)}`)
          .join("\n\n");

        const continuityInstruction = `CONVERSATION CONTEXT:
- This is message ${allMessages.length} in the current chat.
- Recent conversation turns and a compact older summary have been provided through chat history.
- Do not repeat the same answer structure from previous turns unless the user asks for a recap.
- If the latest question depends on earlier context, use the history. If not, answer the latest question directly.`;

        const prompt = isComprehensive
          ? `USER QUESTION: "${message}"

${continuityInstruction}

COMPLETE FINANCIAL PICTURE (net worth, budget, investments, loans, goals, risk profile, health score):
${dataContext}

INSTRUCTIONS:
- This is an open-ended question about growth, planning, strategy, or something not covered by a single specific tool.
- ANALYSE the full data above like an expert wealth advisor would — look across net worth, savings rate, investments, loans, goals, and risk profile together to form your answer.
- Reason about the user's situation: identify what's relevant to their question, connect the dots between different numbers, and give a thoughtful, personalised answer — not a generic template.
- Reference ACTUAL figures from the data (e.g. "with a savings rate of 12% and ₹X in equity exposure...").
- If the relevant data is empty/zero, say so clearly and guide them to add it in Settings — but still give whatever reasoning/guidance you can from what IS available.
- Do NOT use markdown tables. Use short labeled lines for numbers, for example: **Portfolio value:** ₹2.00 L.
- Use a short heading only when helpful, then concise prose or bullets.
- Be precise and concise — aim for under 300 words, more only if the question genuinely needs depth.`
          : `USER QUESTION: "${message}"

${continuityInstruction}

USER'S REAL FINANCIAL DATA:
${dataContext}

INSTRUCTIONS:
- Answer the user's SPECIFIC question using ONLY the numbers from the data above
- Do NOT give generic advice — reference actual values (e.g. "Your savings rate is 18%", not "you should save more")
- If values are 0 or missing, say exactly that and guide them to add the data in Settings
- Do NOT use markdown tables. Use short labeled lines for numbers, for example: **Portfolio value:** ₹2.00 L.
- Use a short heading only when helpful, then concise prose or bullets.
- Be concise — under 250 words unless the question needs more`;

        responseText = await callUnifiedLLM(prompt, AI_CONFIG.systemPrompt, geminiHistory);

        // Fallback: structured formatted response
        if (!responseText) {
          if (toolResults.length === 1) {
            responseText = buildFallbackResponse(toolResults[0].toolName, toolResults[0].result);
          } else {
            const parts = toolResults
              .map(({ toolName, result }) => buildFallbackResponse(toolName, result))
              .filter(r => r && !r.startsWith("⚠️"));
            responseText = parts.join("\n\n---\n\n") || buildFallbackResponse(toolResults[0].toolName, toolResults[0].result);
          }
        }

        responseText = appendContextWarning(responseText, totalConversationTokens);

        const assistantMsg = await AIMessage.create({
          conversationId,
          role: "assistant",
          content: responseText,
          toolCalls: toolResults.map(t => ({ name: t.toolName, params: t.params, result: t.result })),
          totalTokens: estimateTokens(responseText),
        });

        const suggestions = generateSuggestedPrompts(message, responseText);

        return {
          conversationId,
          messageId: assistantMsg.id,
          content: responseText,
          toolCalls: toolResults.map(t => ({ name: t.toolName })),
          suggestions,
          memory: {
            usedHistoryMessages: memory.selectedCount,
            omittedHistoryMessages: memory.omittedCount,
            contextLimitReached: false,
          },
        };
      }
    }

    // For cached / casual / math / faq / general knowledge (no tool calls)
    responseText = appendContextWarning(responseText, totalConversationTokens);
    const suggestions = generateSuggestedPrompts(message, responseText);

    const assistantMsg = await AIMessage.create({
      conversationId,
      role: "assistant",
      content: responseText,
      totalTokens: estimateTokens(responseText),
    });

    return {
      conversationId,
      messageId: assistantMsg.id,
      content: responseText,
      suggestions,
      memory: {
        usedHistoryMessages: memory.selectedCount,
        omittedHistoryMessages: memory.omittedCount,
        contextLimitReached: false,
      },
    };

  } catch (err) {
    console.error("AI Chat Error:", err);
    return { error: err.message || "Something went wrong. Please try again." };
  }
}

// ── Conversation helpers ──────────────────────────────────────────────────────
async function getConversation(userId, conversationId) {
  const conv = await AIConversation.findById(conversationId);
  if (!conv || conv.userId !== userId) return { error: "Conversation not found." };
  const messages = await AIMessage.findByConversationId(conversationId);
  return {
    conversation: { id: conv.id, title: conv.title, createdAt: conv.createdAt, updatedAt: conv.updatedAt },
    messages: messages.map(m => ({ id: m.id, role: m.role, content: m.content, createdAt: m.createdAt })),
  };
}

async function listConversations(userId) {
  const convs = await AIConversation.findByUserId(userId);
  return convs.map(c => ({ id: c.id, title: c.title, lastMessageAt: c.updatedAt, createdAt: c.createdAt }));
}

async function deleteConversation(userId, conversationId) {
  const conv = await AIConversation.findById(conversationId);
  if (!conv || conv.userId !== userId) return { error: "Conversation not found." };
  await AIConversation.remove(conversationId);
  return { success: true };
}

module.exports = { chat, getConversation, listConversations, deleteConversation, TOOL_DEFINITIONS, AI_CONFIG };
