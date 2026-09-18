// ── Real-Time Live Web Search & Grounding Service ───────────────────────────
// Enables AI to answer live news, current rates, RBI policies, and real-time events.
"use strict";

const LIVE_INTENT_PATTERNS = [
  /\b(today|tonight|yesterday|this week|this month|current|currently|latest|recent|news|live|now|happening|update|updated)\b/i,
  /\b(rate|rates|repo rate|inflation|gdp|cpi|interest rate|yield|crude oil|gold price|petrol|diesel|sensex today|nifty today)\b/i,
  /\b(who is the current|who is now|who won|election|budget 2025|budget 2026|rbi governor|sebi chief|prime minister|finance minister)\b/i,
  /\b(what happened to|why did|earnings result|q1|q2|q3|q4|quarterly results|ipo)\b/i,
  /\b(2025|2026)\b/i,
];

function isLiveSearchQuery(query = "") {
  const q = String(query).trim();
  return LIVE_INTENT_PATTERNS.some(pattern => pattern.test(q));
}

/**
 * Free DuckDuckGo HTML Web Search parser
 */
async function searchWebDuckDuckGo(query, maxResults = 5) {
  try {
    const cleanQuery = query.replace(/[^\w\s\d.-]/g, " ").trim();
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(cleanQuery)}`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    if (!res.ok) return [];

    const html = await res.text();
    const results = [];

    // Regex extract result snippets from DuckDuckGo HTML
    const linkRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
    const titleRegex = /<a[^>]+class="result__url"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;

    const snippets = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null && snippets.length < maxResults) {
      const cleanSnippet = match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (cleanSnippet) snippets.push(cleanSnippet);
    }

    // Fallback simple snippet finder if class names vary
    if (snippets.length === 0) {
      const genericSnippet = /<a[^>]+class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((match = genericSnippet.exec(html)) !== null && snippets.length < maxResults) {
        const cleanSnippet = match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
        if (cleanSnippet) snippets.push(cleanSnippet);
      }
    }

    return snippets.map((snippet, i) => ({
      index: i + 1,
      snippet,
    }));
  } catch (err) {
    console.warn("[Web Search Error]:", err.message);
    return [];
  }
}

/**
 * Free Yahoo Finance News & Search parser for market & finance topics
 */
async function searchYahooFinance(query, maxResults = 4) {
  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=3&newsCount=${maxResults}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (!res.ok) return [];
    const data = await res.json();
    const newsItems = data?.news || [];

    return newsItems.map((item, i) => ({
      title: item.title,
      publisher: item.publisher,
      link: item.link,
      summary: item.summary || item.title,
    }));
  } catch {
    return [];
  }
}

/**
 * Live Grounding Context Builder
 */
async function getLiveGroundingContext(query) {
  if (!isLiveSearchQuery(query)) return null;

  try {
    const [webSnippets, financeNews] = await Promise.all([
      searchWebDuckDuckGo(query, 5),
      searchYahooFinance(query, 3),
    ]);

    const contextParts = [];

    if (financeNews && financeNews.length > 0) {
      contextParts.push("### Real-Time Financial News Feed:");
      financeNews.forEach(n => {
        contextParts.push(`- **${n.title}** (${n.publisher || "Finance Feed"}): ${n.summary || ""}`);
      });
    }

    if (webSnippets && webSnippets.length > 0) {
      contextParts.push("### Live Web Search Findings:");
      webSnippets.forEach(s => {
        contextParts.push(`- ${s.snippet}`);
      });
    }

    if (contextParts.length === 0) return null;

    return contextParts.join("\n");
  } catch {
    return null;
  }
}

module.exports = {
  isLiveSearchQuery,
  getLiveGroundingContext,
  searchWebDuckDuckGo,
  searchYahooFinance,
};
