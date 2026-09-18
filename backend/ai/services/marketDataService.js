// ── Real-Time Live Stock & Market Quote Service ──────────────────────────────
// Fetches real-time stock, index, commodity & crypto market quotes with sub-second latency.

const COMMON_TICKER_MAP = {
  // Indian Banking & Financials
  "sbi": "SBIN.NS",
  "state bank": "SBIN.NS",
  "state bank of india": "SBIN.NS",
  "sbin": "SBIN.NS",
  "hdfc": "HDFCBANK.NS",
  "hdfc bank": "HDFCBANK.NS",
  "icici": "ICICIBANK.NS",
  "icici bank": "ICICIBANK.NS",
  "kotak": "KOTAKBANK.NS",
  "kotak bank": "KOTAKBANK.NS",
  "axis bank": "AXISBANK.NS",
  "axis": "AXISBANK.NS",
  "indusind": "INDUSINDBK.NS",
  "pnb": "PNB.NS",
  "bank of baroda": "BANKBARODA.NS",
  "bajaj finance": "BAJFINANCE.NS",
  "bajaj finserv": "BAJAJFINSV.NS",

  // Indian Tech & IT
  "tcs": "TCS.NS",
  "tata consultancy": "TCS.NS",
  "infy": "INFY.NS",
  "infosys": "INFY.NS",
  "wipro": "WIPRO.NS",
  "hcl tech": "HCLTECH.NS",
  "hcl": "HCLTECH.NS",
  "tech mahindra": "TECHM.NS",
  "l&t infotech": "LTIM.NS",
  "ltim": "LTIM.NS",

  // Indian Conglomerates, Energy & Auto
  "reliance": "RELIANCE.NS",
  "ril": "RELIANCE.NS",
  "tata motors": "TATAMOTORS.NS",
  "tatamotors": "TATAMOTORS.NS",
  "tata steel": "TATASTEEL.NS",
  "tata power": "TATAPOWER.NS",
  "tata consumer": "TATACONSUM.NS",
  "maruti": "MARUTI.NS",
  "maruti suzuki": "MARUTI.NS",
  "mahindra": "M&M.NS",
  "m&m": "M&M.NS",
  "l&t": "LT.NS",
  "lt": "LT.NS",
  "larsen": "LT.NS",
  "larsen & toubro": "LT.NS",
  "itc": "ITC.NS",
  "hul": "HINDUNILVR.NS",
  "hindustan unilever": "HINDUNILVR.NS",
  "bharti airtel": "BHARTIARTL.NS",
  "airtel": "BHARTIARTL.NS",
  "ntpc": "NTPC.NS",
  "ongc": "ONGC.NS",
  "coal india": "COALINDIA.NS",
  "adani enterprises": "ADANIENT.NS",
  "adani ports": "ADANIPORTS.NS",
  "adani power": "ADANIPOWER.NS",
  "adani green": "ADANIGREEN.NS",
  "sun pharma": "SUNPHARMA.NS",
  "cipla": "CIPLA.NS",
  "dr reddy": "DRREDDY.NS",
  "titan": "TITAN.NS",
  "asian paints": "ASIANPAINT.NS",
  "zomato": "ZOMATO.NS",
  "paytm": "PAYTM.NS",
  "jio financial": "JIOFIN.NS",
  "swiggy": "SWIGGY.NS",

  // Indices
  "nifty": "^NSEI",
  "nifty 50": "^NSEI",
  "nifty50": "^NSEI",
  "nifty bank": "^NSEBANK",
  "bank nifty": "^NSEBANK",
  "banknifty": "^NSEBANK",
  "nifty it": "^CNXIT",
  "sensex": "^BSESN",
  "bse sensex": "^BSESN",
  "s&p 500": "^GSPC",
  "sp500": "^GSPC",
  "nasdaq": "^IXIC",
  "dow jones": "^DJI",

  // Commodities & Crypto
  "gold": "GOLDBEES.NS",
  "gold price": "GOLDBEES.NS",
  "silver": "SILVERBEES.NS",
  "silver price": "SILVERBEES.NS",
  "bitcoin": "BTC-USD",
  "btc": "BTC-USD",
  "ethereum": "ETH-USD",
  "eth": "ETH-USD",
  "solana": "SOL-USD",

  // Global / US Tech
  "apple": "AAPL",
  "aapl": "AAPL",
  "tesla": "TSLA",
  "tsla": "TSLA",
  "google": "GOOGL",
  "alphabet": "GOOGL",
  "googl": "GOOGL",
  "microsoft": "MSFT",
  "msft": "MSFT",
  "nvidia": "NVDA",
  "nvda": "NVDA",
  "amazon": "AMZN",
  "amzn": "AMZN",
  "meta": "META",
  "facebook": "META",
};

/**
 * Extract ticker symbol or stock query from natural language query
 */
function extractStockQuery(query = "") {
  const q = String(query).toLowerCase().trim();

  // Pattern: "price of [XYZ] stock today", "what is [XYZ] share price", "[XYZ] stock price"
  const priceKeywords = /(?:price|share price|stock price|quote|rate|valuation|chart|market price|today|value of)\b/i;
  const isMarketQuery = priceKeywords.test(q) || /(?:stock|share|nifty|sensex|ticker|crypto|coin|equity price)\b/i.test(q);

  if (!isMarketQuery) return null;

  // Direct map check
  for (const [key, symbol] of Object.entries(COMMON_TICKER_MAP)) {
    const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (regex.test(q)) {
      return { symbol, queryName: key };
    }
  }

  // Extract clean company name candidate
  const cleanMatch = q
    .replace(/(?:what is the|what is|tell me the|price of|share price of|stock price of|share price|stock price|stock|share|today|now|current price of|current price|latest price|rate of|quote for|quote of|\?)/gi, "")
    .trim();

  if (cleanMatch.length >= 2 && cleanMatch.length <= 30) {
    return { symbol: null, queryName: cleanMatch };
  }

  return null;
}

/**
 * Resolve ticker symbol dynamically via Yahoo search if not in static map
 */
async function resolveSymbol(queryName) {
  if (!queryName) return null;
  const lower = queryName.toLowerCase().trim();
  if (COMMON_TICKER_MAP[lower]) return COMMON_TICKER_MAP[lower];

  try {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(queryName)}&quotesCount=5&newsCount=0`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const quotes = data?.quotes || [];
    if (!quotes.length) return null;

    // Prefer NSE (.NS) or BSE (.BO) if available
    const indianQuote = quotes.find(q => q.symbol?.endsWith(".NS") || q.symbol?.endsWith(".BO"));
    if (indianQuote) return indianQuote.symbol;

    return quotes[0]?.symbol || null;
  } catch {
    return null;
  }
}

/**
 * Fetch real-time market quote data from Yahoo Finance
 */
async function getLiveStockQuote(queryOrSymbol) {
  let symbol = queryOrSymbol;
  let labelName = queryOrSymbol;

  const extracted = extractStockQuery(queryOrSymbol);
  if (extracted) {
    if (extracted.symbol) {
      symbol = extracted.symbol;
      labelName = extracted.queryName;
    } else {
      symbol = await resolveSymbol(extracted.queryName);
      labelName = extracted.queryName;
    }
  } else {
    symbol = await resolveSymbol(queryOrSymbol);
  }

  if (!symbol) return null;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    if (!meta || meta.regularMarketPrice == null) return null;

    const currentPrice = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose || currentPrice;
    const change = currentPrice - prevClose;
    const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
    const isPositive = change >= 0;
    const currency = meta.currency === "INR" ? "₹" : meta.currency === "USD" ? "$" : `${meta.currency} `;

    const formatNum = (n) => {
      if (n == null || isNaN(n)) return "N/A";
      return n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    };

    const companyName = meta.longName || meta.shortName || labelName.toUpperCase();
    const exchange = meta.fullExchangeName || meta.exchangeName || "NSE";
    const directionEmoji = isPositive ? "🟢 📈" : "🔴 📉";
    const sign = isPositive ? "+" : "";

    return {
      symbol,
      companyName,
      currency: meta.currency,
      currencySymbol: currency,
      currentPrice,
      prevClose,
      change,
      changePct,
      dayHigh: meta.regularMarketDayHigh,
      dayLow: meta.regularMarketDayLow,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      volume: meta.regularMarketVolume,
      exchange,
      marketTime: new Date(meta.regularMarketTime * 1000).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }),
      markdown: `### ${directionEmoji} **${companyName}** (\`${symbol}\`)

**Live Price**: **${currency}${formatNum(currentPrice)}** \`(${sign}${currency}${formatNum(change)} / ${sign}${changePct.toFixed(2)}%)\`

| Metric | Value |
|---|---|
| **Day Range** | ${currency}${formatNum(meta.regularMarketDayLow)} – ${currency}${formatNum(meta.regularMarketDayHigh)} |
| **52-Week Range** | ${currency}${formatNum(meta.fiftyTwoWeekLow)} – ${currency}${formatNum(meta.fiftyTwoWeekHigh)} |
| **Previous Close** | ${currency}${formatNum(prevClose)} |
| **Volume** | ${meta.regularMarketVolume ? meta.regularMarketVolume.toLocaleString("en-IN") : "N/A"} |
| **Exchange** | ${exchange} |
| **Last Updated** | ${new Date(meta.regularMarketTime * 1000).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })} IST |

💡 *Real-time market quote provided via live feed.*`,
    };
  } catch (err) {
    console.warn("Error fetching live stock quote for", symbol, err.message);
    return null;
  }
}

module.exports = {
  extractStockQuery,
  resolveSymbol,
  getLiveStockQuote,
};
