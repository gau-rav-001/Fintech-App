/**
 * Multi-Provider LLM Adapter for SmartFinance AI
 * Supports: Groq (100% Free & blazing fast), OpenRouter (Free tier), Gemini, Ollama (Local), OpenAI
 */

// ── Groq API (Free at https://console.groq.com/keys) ───────────────────────────
const GROQ_FALLBACK_MODELS = [
  process.env.GROQ_MODEL,
  "openai/gpt-oss-120b",
  "qwen/qwen3.6-27b",
  "groq/compound",
  "openai/gpt-oss-20b",
  "llama-3.3-70b-versatile",
].filter(Boolean);

async function callGroq(prompt, systemPrompt = "", history = []) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || !apiKey.startsWith("gsk_")) return null;

  const messages = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  for (const h of history) {
    const role = h.role === "model" ? "assistant" : h.role;
    const content = typeof h.parts?.[0]?.text === "string" ? h.parts[0].text : (h.content || "");
    if (content) messages.push({ role, content });
  }

  messages.push({ role: "user", content: prompt });

  for (const model of GROQ_FALLBACK_MODELS) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.3,
          max_tokens: 1500,
        }),
      });

      if (!res.ok) {
        if (res.status === 404) continue; // Try next model in fallback list
        const errText = await res.text().catch(() => "");
        console.warn(`[Groq Error ${res.status} on model ${model}]:`, errText.slice(0, 200));
        continue;
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content?.trim();
      if (content && content.length > 5) return content;
    } catch (err) {
      console.warn(`[Groq Network Error on model ${model}]:`, err.message);
    }
  }

  return null;
}

// ── OpenRouter API (Free models at https://openrouter.ai/keys) ────────────────
async function callOpenRouter(prompt, systemPrompt = "", history = []) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  const messages = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  for (const h of history) {
    const role = h.role === "model" ? "assistant" : h.role;
    const content = typeof h.parts?.[0]?.text === "string" ? h.parts[0].text : (h.content || "");
    if (content) messages.push({ role, content });
  }

  messages.push({ role: "user", content: prompt });

  try {
    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "HTTP-Referer": "http://localhost:5173",
        "X-Title": "SmartFinance AI",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.warn(`[OpenRouter Error ${res.status}]:`, errText.slice(0, 200));
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.warn("[OpenRouter Network Error]:", err.message);
    return null;
  }
}

// ── Ollama Local LLM (100% Free, Offline, e.g. http://localhost:11434) ────────
async function callOllama(prompt, systemPrompt = "", history = []) {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434";
  const model = process.env.OLLAMA_MODEL || "llama3.2";

  const messages = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });

  for (const h of history) {
    const role = h.role === "model" ? "assistant" : h.role;
    const content = typeof h.parts?.[0]?.text === "string" ? h.parts[0].text : (h.content || "");
    if (content) messages.push({ role, content });
  }
  messages.push({ role: "user", content: prompt });

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.message?.content?.trim() || null;
  } catch {
    return null; // Ollama not running locally
  }
}

module.exports = {
  callGroq,
  callOpenRouter,
  callOllama,
};
