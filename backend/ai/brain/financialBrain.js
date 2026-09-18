// ── SmartFinance High-Speed Offline Financial Brain & LRU Response Cache ─────
"use strict";

// ── In-Memory LRU Cache with TTL ──────────────────────────────────────────────
class ResponseCache {
  constructor(maxSize = 500, ttlMs = 1000 * 60 * 60) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    // Refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, item);
    return item.value;
  }

  set(key, value) {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttlMs,
    });
  }

  normalizeKey(query) {
    return String(query || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w\s%₹]/g, "")
      .replace(/\s+/g, " ");
  }
}

const queryCache = new ResponseCache(1000, 1000 * 60 * 60 * 2); // 2 hours TTL

// ── Currency & Percentage Formatters ─────────────────────────────────────────
function fmtInr(val) {
  const n = parseFloat(val) || 0;
  if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

// ── Financial Math & Calculation Solver ───────────────────────────────────────
function solveFinancialMath(query = "") {
  const q = String(query).toLowerCase().trim();

  // 1. Reverse Goal SIP Calculator: English & Hinglish
  // e.g., "reach 1 cr in 10 years at 12%", "how to get 50 lakhs in 7 years at 14%", "10 saal me 50 lakh banane ke liye kitna sip chahiye"
  const revSipMatch = q.match(/(?:reach|get|accumulate|target|save|build|make|banane ke liye|kitna sip)\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|lakhs?|lac|k)?\s*(?:in|for|me|mein)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?|saal|sal)?\s*(?:at|@)?\s*(\d+(?:\.\d+)?)\s*%?/i) ||
                      q.match(/(?:in|for|me|mein)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?|saal|sal)\s*(?:me|mein)?\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|lakhs?|lac|k)\s*(?:banane|reach|get|save)?/i) ||
                      q.match(/sip\s*(?:needed|required)?\s*(?:for|to get|to reach)?\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|lakhs?|lac|k)?\s*(?:in|for|me)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?|saal)?\s*(?:at|@)?\s*(\d+(?:\.\d+)?)\s*%?/i);
  if (revSipMatch) {
    let target = 0;
    let nYears = 0;
    let r = 12;

    if (q.includes("saal") && /^\s*(?:in|for|me|mein)?\s*\d+\s*(?:years?|yrs?|saal)/i.test(q)) {
      nYears = parseFloat(revSipMatch[1]);
      target = parseFloat(revSipMatch[2]);
      const unit = (revSipMatch[3] || "").toLowerCase();
      if (unit.startsWith("cr")) target *= 10_000_000;
      else if (unit.startsWith("lac") || unit.startsWith("lakh")) target *= 100_000;
      else if (unit.startsWith("k")) target *= 1_000;
      else if (target <= 100) target *= 100_000;
    } else {
      target = parseFloat(revSipMatch[1]);
      const unit = (revSipMatch[2] || "").toLowerCase();
      if (unit.startsWith("cr")) target *= 10_000_000;
      else if (unit.startsWith("lac") || unit.startsWith("lakh")) target *= 100_000;
      else if (unit.startsWith("k")) target *= 1_000;
      else if (target <= 100) target *= 100_000;

      nYears = parseFloat(revSipMatch[3]);
      r = parseFloat(revSipMatch[4] || "12");
    }

    if (target > 0 && nYears > 0 && r > 0) {
      const i = r / (12 * 100);
      const nMonths = nYears * 12;
      const monthlySIP = (target * i) / ((Math.pow(1 + i, nMonths) - 1) * (1 + i));
      const totalInvested = monthlySIP * nMonths;
      const wealthGained = target - totalInvested;

      return `### 🎯 Goal Wealth Planner: Target ${fmtInr(target)}

To build **${fmtInr(target)}** in **${nYears} Years** at an expected return of **${r}% p.a.**:

---

| Metric | Details |
|---|---|
| **Required Monthly SIP** | **${fmtInr(monthlySIP)} / month** |
| **Total Horizon** | **${nYears} Years** (${nMonths} installments) |
| **Total Amount You Invest** | **${fmtInr(totalInvested)}** |
| **Estimated Compounded Growth** | **${fmtInr(wealthGained)}** (${Math.round((wealthGained/target)*100)}% of corpus) |

---

### 💡 Recommended Portfolio Mix:
• **70% Equity Funds** (Flexi-cap / Large & Mid-cap for compounding growth)
• **20% Mid & Small Cap** (For alpha generation over ${nYears}+ years)
• **10% Debt / Arbitrage** (Emergency buffer & rebalancing)

🚀 *Tip: Start with **${fmtInr(monthlySIP)}/mo** and increase your SIP by **10% every year** (Step-Up SIP) to reach your goal **2.5 years earlier**!*`;
    }
  }

  // 2. Inflation & Purchasing Power Calculator: "1 cr in 20 years at 6% inflation" or "purchasing power of 50 lakhs in 15 years"
  const infMatch = q.match(/(?:purchasing power of|value of|worth of)?\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|lakhs?|lac)?\s*(?:in|after)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:at|with)?\s*(\d+(?:\.\d+)?)\s*%\s*inflation/i) ||
                   q.match(/inflation\s*(?:of)?\s*(\d+(?:\.\d+)?)\s*%\s*(?:on)?\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(cr|crore|lakhs?|lac)?\s*(?:for|in)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i);
  if (infMatch) {
    let amount = parseFloat(infMatch[1]);
    let unit = (infMatch[2] || "").toLowerCase();
    let nYears, infRate;

    if (q.startsWith("inflation")) {
      infRate = parseFloat(infMatch[1]);
      amount = parseFloat(infMatch[2]);
      unit = (infMatch[3] || "").toLowerCase();
      nYears = parseFloat(infMatch[4]);
    } else {
      nYears = parseFloat(infMatch[3]);
      infRate = parseFloat(infMatch[4] || "6");
    }

    if (unit.startsWith("cr")) amount *= 10_000_000;
    else if (unit.startsWith("lac") || unit.startsWith("lakh")) amount *= 100_000;
    else if (amount <= 100) amount *= 100_000;

    if (amount > 0 && nYears > 0 && infRate > 0) {
      // Purchasing power: PV = FV / (1 + r)^n
      const realValue = amount / Math.pow(1 + infRate / 100, nYears);
      const futureEquivalent = amount * Math.pow(1 + infRate / 100, nYears);

      return `### 📉 Inflation & Purchasing Power Analysis

• **Base Amount**: ${fmtInr(amount)}
• **Time Frame**: ${nYears} Years
• **Assumed Inflation**: ${infRate}% p.a.

---

| Scenario | Value | Explanation |
|---|---|---|
| **Future Purchasing Power** | **${fmtInr(realValue)}** | In ${nYears} years, **${fmtInr(amount)}** will buy what **${fmtInr(realValue)}** buys today. |
| **Target for Same Lifestyle** | **${fmtInr(futureEquivalent)}** | You will need **${fmtInr(futureEquivalent)}** in ${nYears} years to match today's **${fmtInr(amount)}** standard of living. |

💡 *To prevent wealth erosion from ${infRate}% inflation, ensure your long-term investments target at least **11% - 13% CAGR** via diversified equity mutual funds.*`;
    }
  }

  // 3. 50/30/20 Salary Budget Allocator: "budget for 1 lakh salary" or "50 30 20 rule for 75000"
  const budgetMatch = q.match(/(?:budget|allocate|split|50\/?30\/?20|rule)\s*(?:for)?\s*(?:₹|rs\.?\s*)?(\d[\d,]*|\d+(?:\.\d+)?)\s*(cr|crore|lakhs?|lac|k)?\s*(?:salary|income|per month|monthly)?/i);
  if (budgetMatch && (q.includes("budget") || q.includes("salary") || q.includes("50") || q.includes("allocate"))) {
    let income = parseFloat(budgetMatch[1].replace(/,/g, ""));
    const unit = (budgetMatch[2] || "").toLowerCase();
    if (unit.startsWith("cr")) income *= 10_000_000;
    else if (unit.startsWith("lac") || unit.startsWith("lakh")) income *= 100_000;
    else if (unit.startsWith("k")) income *= 1_000;
    else if (income < 500 && income > 0) income *= 100_000;

    if (income >= 5000) {
      const needs = income * 0.50;
      const wants = income * 0.30;
      const savings = income * 0.20;

      return `### 🪙 50/30/20 Smart Monthly Budget Breakdown (Income: ${fmtInr(income)}/mo)

---

### 1. 🏠 Needs — 50% (${fmtInr(needs)}/month)
*Essential survival & obligations:*
• Rent / Home Loan EMI & Maintenance
• Groceries, utilities, bills & broadband
• Commute, fuel, term & health insurance premiums

### 2. 🍿 Wants — 30% (${fmtInr(wants)}/month)
*Lifestyle & personal fulfillment:*
• Dining out, food delivery & cafes
• Shopping, gadgets & entertainment/OTT
• Weekend getaways & leisure hobbies

### 3. 🚀 Wealth Builder & Savings — 20% (${fmtInr(savings)}/month minimum)
*Future freedom & security:*
• **Emergency Fund**: Maintain 6 months of expenses in Liquid Funds
• **Monthly SIPs**: Direct Index/Flexi-cap equity mutual funds
• **Retirement & Tax**: PPF / NPS / ELSS

💡 *Pro Tip: If you can live on 40% needs, boost your **Wealth Builder** to 30-40% to achieve financial independence 8-10 years earlier!*`;
    }
  }

  // 4. SIP Compounding Calculator: "SIP 5000 12% 10 years" or "SIP of 10000 for 15 yrs at 14%"
  const sipMatch = q.match(/sip\s*(?:of)?\s*(?:₹|rs\.?\s*)?(\d[\d,]*)\s*(?:for|in)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)\s*(?:at|@)?\s*(\d+(?:\.\d+)?)\s*%?/i) ||
                   q.match(/sip\s*(?:of)?\s*(?:₹|rs\.?\s*)?(\d[\d,]*)\s*(?:at|@)?\s*(\d+(?:\.\d+)?)\s*%\s*(?:for)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i);
  if (sipMatch) {
    let p, nYears, r;
    if (q.includes("year") && q.indexOf("year") < q.indexOf("%")) {
      p = parseFloat(sipMatch[1].replace(/,/g, ""));
      nYears = parseFloat(sipMatch[2]);
      r = parseFloat(sipMatch[3]);
    } else {
      p = parseFloat(sipMatch[1].replace(/,/g, ""));
      r = parseFloat(sipMatch[2]);
      nYears = parseFloat(sipMatch[3]);
    }

    if (p > 0 && nYears > 0 && r > 0) {
      const i = r / (12 * 100);
      const nMonths = nYears * 12;
      const totalInvested = p * nMonths;
      const maturity = p * ((Math.pow(1 + i, nMonths) - 1) / i) * (1 + i);
      const wealthGained = maturity - totalInvested;

      return `### 📈 SIP Compounding Simulation

• **Monthly SIP**: ${fmtInr(p)}
• **Time Horizon**: ${nYears} Years (${nMonths} months)
• **Expected Annual Return**: ${r}% p.a.

---

| Metric | Amount |
|---|---|
| **Total Invested** | **${fmtInr(totalInvested)}** |
| **Est. Wealth Gained** | **${fmtInr(wealthGained)}** |
| **Total Maturity Value** | **${fmtInr(maturity)}** |

💡 *Compounding multiplies your returns over longer horizons. Try our interactive **SIP & Lumpsum Calculator** in the Calculators tab!*`;
    }
  }

  // 5. Loan EMI Calculator: "EMI of 50 lakhs at 8.5% for 20 years"
  const emiMatch = q.match(/emi\s*(?:of|for)?\s*(?:₹|rs\.?\s*)?(\d+(?:\.\d+)?)\s*(?:lakhs?|lac|cr|crore)?\s*(?:at|@)?\s*(\d+(?:\.\d+)?)\s*%\s*(?:for)?\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?)/i);
  if (emiMatch) {
    let p = parseFloat(emiMatch[1]);
    if (/cr|crore/i.test(q)) p = p * 10_000_000;
    else if (/lakh|lac/i.test(q)) p = p * 100_000;
    else if (p < 1000) p = p * 100_000;

    const r = parseFloat(emiMatch[2]);
    const nYears = parseFloat(emiMatch[3]);

    if (p > 0 && r > 0 && nYears > 0) {
      const monthlyRate = r / (12 * 100);
      const nMonths = nYears * 12;
      const emi = (p * monthlyRate * Math.pow(1 + monthlyRate, nMonths)) / (Math.pow(1 + monthlyRate, nMonths) - 1);
      const totalPayable = emi * nMonths;
      const totalInterest = totalPayable - p;

      return `### 🏦 Loan EMI Calculation

• **Loan Principal**: ${fmtInr(p)}
• **Interest Rate**: ${r}% p.a.
• **Tenure**: ${nYears} Years (${nMonths} months)

---

| Metric | Amount |
|---|---|
| **Monthly EMI** | **${fmtInr(emi)}/month** |
| **Principal Amount** | **${fmtInr(p)}** |
| **Total Interest Payable** | **${fmtInr(totalInterest)}** |
| **Total Payment (Principal + Interest)** | **${fmtInr(totalPayable)}** |

💡 *Prepaying just 1 extra EMI each year can shave off 3-4 years from a 20-year home loan!*`;
    }
  }

  // 6. Percentages: "25% of 85000"
  const pctMatch = q.match(/(\d+(?:\.\d+)?)\s*%\s*(?:of)\s*(?:₹|rs\.?\s*)?(\d[\d,]*(?:\.\d+)?)/i);
  if (pctMatch) {
    const p = parseFloat(pctMatch[1]);
    const total = parseFloat(pctMatch[2].replace(/,/g, ""));
    const res = (p / 100) * total;
    return `### 🧮 Calculation Result\n\n**${p}% of ${total.toLocaleString("en-IN")}** = **${res.toLocaleString("en-IN")}**\n\n*Formula:* \`(${p} / 100) × ${total} = ${res}\``;
  }

  // 7. Arithmetic: "45000 + 12000 - 8000"
  if (/^[\d\s\+\-\*\/\.\(\)]+$/.test(q) && /[\+\-\*\/]/.test(q)) {
    try {
      const sanitized = q.replace(/[^0-9\+\-\*\/\.\(\)\s]/g, "");
      const res = Function(`"use strict"; return (${sanitized})`)();
      if (typeof res === "number" && !isNaN(res) && isFinite(res)) {
        return `### 🧮 Calculation Result\n\n\`${q} = ${res.toLocaleString("en-IN")}\``;
      }
    } catch {
      // ignore
    }
  }

  return null;
}

// ── Instant Conversational / Small Talk Responses ───────────────────────────
const CASUAL_RESPONSES = {
  greetings: [
    "Hey! 👋 I'm **SmartFinance AI**, your personal wealth advisor. Ask me about your **budget, investments, health score, tax planning**, or any general query!",
    "Hello! 😊 Ready to help you grow your wealth. Would you like to **check your financial health score**, review your **monthly budget**, or simulate a **SIP**?",
    "Hi there! 👋 I'm here to assist with portfolio tracking, tax savings, loan payoff strategies, or general questions. What's on your mind today?",
  ],
  gratitude: [
    "You're very welcome! 😊 Always here to help you achieve your financial goals. Let me know if you need anything else!",
    "Glad I could help! 🚀 Keep building that wealth. Feel free to ask whenever you need guidance!",
    "Anytime! 👍 Making smart financial choices is a journey. I'm always here to assist!",
  ],
  capabilities: `### 🤖 What I Can Do For You

I am **SmartFinance AI** — your state-of-the-art wealth manager and polymath assistant:

1. **📊 Personal Financial Health**:
   • Audit your **Financial Health Score** (0-100) and get tailored improvement steps.
   • Track **Net Worth**, Asset Allocation, and Monthly Savings Rate.
2. **📈 Wealth Creation & Projections**:
   • **SIP & Lumpsum Forecasting** with compound interest simulations.
   • **Reverse Goal Planning**: Calculate exact SIP needed to reach ₹1 Cr or ₹50 Lakhs.
   • **Inflation Impact**: Analyze real purchasing power decay over 10-30 years.
3. **🧾 Indian Tax Optimization**:
   • New vs Old Regime comparison for FY 2024-25 / AY 2025-26.
   • Maximize Section 80C, 80D, 80CCD (NPS), and Home Loan deductions.
4. **💳 Debt & Loan Strategies**:
   • Debt Avalanche vs Snowball payoff plans to save interest.
   • Affordability checks for major purchases (Cars, Homes, EMIs).
5. **🌐 Universal Knowledge & Engineering**:
   • Mathematics, software engineering, algorithms, science, and life advice.

💡 *Try asking: **"How to reach 1 Cr in 10 years at 12%?"** or **"50 30 20 budget for 80,000 salary"**.*`,
};

function getInstantCasualResponse(query = "") {
  const clean = String(query).toLowerCase().trim().replace(/[!?.,]+$/, "");

  if (/^(who are you|what can you do|help|capabilities|menu|features|how to use)\b/i.test(clean)) {
    return CASUAL_RESPONSES.capabilities;
  }

  if (/^(thanks|thank you|thx|appreciate it|great job|awesome)\b/i.test(clean)) {
    const list = CASUAL_RESPONSES.gratitude;
    return list[Math.floor(Math.random() * list.length)];
  }

  if (/^(hi|hii|hey|heyy|hello|helo|namaste|good morning|good evening|good afternoon|sup|yo)\b/i.test(clean) && clean.split(/\s+/).length <= 4) {
    const list = CASUAL_RESPONSES.greetings;
    return list[Math.floor(Math.random() * list.length)];
  }

  return null;
}

// ── Top Frequently Asked Financial Topics (Zero API Call Engine) ─────────────
const FREQUENT_FINANCE_FAQS = [
  {
    patterns: [/sip vs lump\s*sum|lump\s*sum vs sip|which is better sip or lump\s*sum/i],
    response: `### 📈 SIP vs Lumpsum Investment: Which is Better?

| Parameter | Systematic Investment Plan (SIP) | Lumpsum Investment |
|---|---|---|
| **Best When** | Regular monthly income (Salaried) | Receiving a windfall, bonus, or liquidity |
| **Market Timing** | **Zero timing required**; buys across market highs and lows | Best when market is in a deep correction / bear phase |
| **Risk Mitigation** | High (Rupee Cost Averaging) | Higher short-term volatility risk |
| **Discipline** | Automated investing habit | Requires discipline not to time the market |

**💡 Smart Strategy (STP)**:
If you have a large lumpsum, park it in a **Liquid Mutual Fund** and initiate a **Systematic Transfer Plan (STP)** over 6-12 months into equity funds to average your purchase price!`,
  },
  {
    patterns: [/(?:new|old)\s+(?:vs|or|and)\s+(?:old|new)\s+tax|tax\s+regime\s+comparison|which\s+tax\s+regime/i],
    response: `### 🧾 New vs Old Tax Regime (FY 2024-25 / AY 2025-26)

**New Tax Regime (Default):**
• **Standard Deduction**: ₹75,000 (increased in Budget 2024).
• **Tax-Free Income**: Up to **₹7.75 Lakhs** (after standard deduction & 87A rebate).
• **Pros**: Lower tax slabs, zero documentation required.
• **Cons**: No 80C, 80D, or HRA deductions allowed.

**Old Tax Regime (Optional):**
• Allows major exemptions: **80C (₹1.5 L)**, **80D (₹25k-₹75k)**, **80CCD(1B) NPS (₹50k)**, **Home Loan Interest 24b (₹2.0 L)**, and **HRA**.

**🎯 Rule of Thumb**:
• If your total deductions are **less than ₹3.75 - ₹4.0 Lakhs**, the **New Regime** saves you more tax.
• If your deductions exceed ₹4.0 Lakhs (e.g. Home Loan + 80C + 80D + HRA), the **Old Regime** may be better.`,
  },
  {
    patterns: [/fire movement|retire early|how to retire early|4% rule/i],
    response: `### 🔥 The FIRE Movement & The 4% Rule

**FIRE** (*Financial Independence, Retire Early*) relies on aggressive savings and compounding:

1. **Target Corpus (The 25x - 30x Rule)**:
   • Estimate your annual living expenses in retirement.
   • Your Target Corpus = **Annual Expenses × 25 to 30**.
   • *Example*: If you need ₹12 Lakhs/year $\rightarrow$ Target Corpus = **₹3.0 Cr to ₹3.6 Cr**.

2. **The 4% Safe Withdrawal Rate (SWR)**:
   • In your first year of retirement, withdraw 4% of your total portfolio.
   • Adjust that amount annually for inflation.
   • Historically, a 60/40 equity/debt portfolio will survive 30+ years without depleting.

💡 *Check our **Retirement Planning** tab to project your retirement corpus based on your current SIPs!*`,
  },
  {
    patterns: [/term insurance vs ulip|ulip vs term|should i buy ulip/i],
    response: `### 🛡️ Term Insurance vs ULIP / Endowment Plans

**Rule #1 of Personal Finance**: *Never mix Insurance with Investment.*

• **Pure Term Insurance**:
  - High cover at very low cost (e.g. ₹1-2 Crore cover for ~₹1,000/month).
  - Protects your family if the earning member passes away.
  - No maturity return (pure risk cover).

• **ULIPs / Endowment Plans**:
  - High agent commissions (up to 10-30% in initial years).
  - Low life cover (typically just 10x annual premium).
  - Low historical returns (4-7% p.a., barely beating inflation).

**💡 Recommendation**: Buy a pure **Term Plan** for life cover and invest the remaining money in **Direct Mutual Funds (SIP)**!`,
  },
  {
    patterns: [/ppf vs epf vs nps|difference between ppf epf and nps/i],
    response: `### 🏦 PPF vs EPF vs NPS Comparison

| Feature | PPF (Public Provident Fund) | EPF (Employees' Provident Fund) | NPS (National Pension Scheme) |
|---|---|---|---|
| **Eligibility** | All Indian Residents | Salaried Employees | All Indian Citizens (18-70) |
| **Current Return** | ~7.1% (Govt backed) | ~8.25% p.a. | 10% - 14% (Market linked) |
| **Lock-in** | 15 Years | Till Retirement / Job Change | Till age 60 |
| **Tax Status** | **EEE** (Exempt-Exempt-Exempt) | **EEE** (up to ₹2.5 L/yr) | **EEE** (60% lump sum tax-free) |
| **Extra Deduction** | Part of ₹1.5 L (80C) | Part of ₹1.5 L (80C) | **Extra ₹50,000 u/s 80CCD(1B)** |`,
  },
  {
    patterns: [/sgb vs physical gold|gold etf vs digital gold|how to invest in gold/i],
    response: `### 🪙 Sovereign Gold Bonds (SGB) vs Gold ETFs vs Physical Gold

| Parameter | SGB (Govt. Bonds) | Gold ETF / Fund | Physical Gold (Jewelry/Coins) |
|---|---|---|---|
| **Extra Interest** | **+2.50% p.a. guaranteed** | 0% | 0% |
| **Capital Gains Tax** | **100% Tax-Free on 8-yr maturity** | Normal LTCG (12.5%) | Making charges + 3% GST + LTCG |
| **Making / Storage Cost** | **Zero** | Minimal TER (~0.3-0.5%) | 8% - 25% Making charges + Locker fee |
| **Purity Risk** | 999 Sovereign guarantee | 99.5%+ Pure | Subject to hallmark verification |

**💡 Recommendation**: If holding for 5-8 years, **SGBs from secondary market** or **Gold ETFs** are vastly superior to physical jewelry for pure investment.`,
  },
  {
    patterns: [/debt avalanche|debt snowball|avalanche vs snowball|pay off debt|how to pay off loan/i],
    response: `### 💳 Debt Avalanche vs Debt Snowball: Pay Off Debt Fast

| Method | How It Works | Psychological Benefit | Financial Benefit |
|---|---|---|---|
| **Debt Avalanche** *(Recommended)* | Pay minimum on all, put all extra cash towards the **highest interest rate** debt (e.g. Credit Card 42% > Personal Loan 15% > Home Loan 8.5%). | Logical & disciplined. | **Saves the maximum interest money.** |
| **Debt Snowball** | Pay off the **smallest loan balance first**, regardless of interest rate. | Quick mental wins as accounts close one by one. | Higher total interest paid over time. |

**💡 Golden Rule**: Always eradicate Credit Card debt (36-45% APR) first before starting any mutual fund SIP!`,
  },
  {
    patterns: [/active vs index funds|index fund vs mutual fund|nifty 50 index/i],
    response: `### 📊 Active Mutual Funds vs Nifty 50 Index Funds

• **Index Funds (Passive)**:
  - Simply replicate the benchmark index (e.g. Nifty 50, Nifty Next 50).
  - Ultra-low expense ratio (**0.05% - 0.20%**).
  - Outperforms >80% of active large-cap fund managers over a 10-year period (SPIVA Report).

• **Active Funds**:
  - Fund manager actively picks stocks aiming to beat the index.
  - Higher expense ratio (**0.50% - 1.50%**).
  - Well-suited for **Mid-Cap and Small-Cap** spaces where market inefficiencies exist.

**💡 Winning Strategy**: Use **Nifty 50 Index Fund** for Large-Cap core, and choose **Active Funds** for Mid/Small Cap exposure!`,
  },
  {
    patterns: [/what is (?:a )?mutual fund|mutual fund basics|how do mutual funds work|types of mutual funds/i],
    response: `### 📊 What is a Mutual Fund?

A **Mutual Fund** pools money from thousands of individual investors to build a professionally managed portfolio of **stocks, bonds, or gold**.

**How It Works:**
1. **Units & NAV**: When you invest, you receive units based on the fund's **Net Asset Value (NAV)**.
2. **Diversification**: ₹500/month buys you fractional ownership across 50–100 top companies.
3. **Fund Manager**: A SEBI-registered Asset Management Company (AMC) conducts research and rebalances the fund.

**Major Categories:**
• **Equity Funds**: High growth potential over 5–7+ years (Large Cap, Flexi Cap, Mid Cap, Small Cap).
• **Debt Funds**: Low risk, fixed income alternative to Fixed Deposits (Liquid Funds, Short Duration).
• **Hybrid Funds**: Balanced mix of 65% Equity + 35% Debt for moderate risk investors.

💡 *Pro Tip: Always choose **Direct - Growth** plans rather than Regular plans to eliminate distributor commissions!*`,
  },
  {
    patterns: [/what is (?:a )?p\/?e ratio|price to earnings|pe ratio explained/i],
    response: `### 📈 Price-to-Earnings (P/E) Ratio Explained

The **P/E Ratio** measures how much investors are willing to pay for each ₹1 of a company's annual earnings:

$$\\text{P/E Ratio} = \\frac{\\text{Market Price per Share}}{\\text{Earnings per Share (EPS)}}$$

**How to Interpret:**
• **High P/E (e.g. >40x)**: Market expects high future earnings growth (e.g., Tech/Consumer companies) or the stock is overvalued.
• **Low P/E (e.g. <15x)**: Value stock, mature industry, or company facing short-term headwinds.
• **Benchmark Comparison**: Always compare a stock's P/E against its **industry average** and its **own historical 5-year median P/E**, not across unrelated sectors.`,
  },
];

function getFrequentFinanceResponse(query = "") {
  const q = String(query).toLowerCase().trim();
  for (const faq of FREQUENT_FINANCE_FAQS) {
    if (faq.patterns.some(p => p.test(q))) {
      return faq.response;
    }
  }
  return null;
}

// ── Dynamic Contextual Follow-Up Suggestions Engine ──────────────────────────
function generateSuggestedPrompts(query = "", responseText = "") {
  const q = String(query).toLowerCase();
  const res = String(responseText).toLowerCase();

  if (q.includes("stock") || q.includes("share") || q.includes("price") || q.includes("nifty") || q.includes("sensex") || res.includes("live price") || res.includes("52-week")) {
    return [
      "Nifty 50 today",
      "Reliance share price",
      "Active vs Nifty 50 Index Funds",
    ];
  }

  if (q.includes("sip") || q.includes("reach") || q.includes("goal") || q.includes("cr") || res.includes("compounding")) {
    return [
      "1 Cr in 20 years with 6% inflation",
      "50 30 20 budget for ₹80,000 salary",
      "Active vs Index Funds comparison",
    ];
  }

  if (q.includes("tax") || q.includes("regime") || q.includes("80c") || q.includes("deduction")) {
    return [
      "PPF vs EPF vs NPS comparison",
      "Term Insurance vs ULIP",
      "Show my tax planning summary",
    ];
  }

  if (q.includes("gold") || q.includes("sgb") || q.includes("portfolio") || q.includes("invest")) {
    return [
      "Active vs Nifty 50 Index Funds",
      "SGB vs physical gold",
      "How is my investment portfolio doing?",
    ];
  }

  if (q.includes("loan") || q.includes("emi") || q.includes("debt") || q.includes("avalanche")) {
    return [
      "Debt Avalanche vs Debt Snowball",
      "EMI of 50 lakhs at 8.5% for 20 years",
      "Summarise my loans and EMIs",
    ];
  }

  if (q.includes("budget") || q.includes("salary") || q.includes("expense") || q.includes("emergency")) {
    return [
      "How to reach 1 Cr in 10 years at 12%?",
      "New vs Old tax regime comparison",
      "What is my financial health score?",
    ];
  }

  // Default well-balanced prompt chips
  return [
    "What is my financial health score?",
    "How to reach 1 Cr in 10 years at 12%?",
    "50 30 20 budget for ₹80,000 salary",
  ];
}

module.exports = {
  queryCache,
  solveFinancialMath,
  getInstantCasualResponse,
  getFrequentFinanceResponse,
  generateSuggestedPrompts,
  fmtInr,
};


