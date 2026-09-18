const { GoogleGenerativeAI } = require("@google/generative-ai");

let genAI = null;
function getGenAI() {
  if (!genAI && process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

const DEFAULT_CHAT_MODEL = "gemini-1.5-flash";

// Pass systemInstruction so Gemini treats it as a system prompt, not a user message
// modelName allows callers to override the default model (used for fallback on overload)
function getModel(systemInstruction, modelName) {
  const ai = getGenAI();
  if (!ai) return null;
  return ai.getGenerativeModel({
    model: modelName || process.env.GEMINI_MODEL_CHAT || DEFAULT_CHAT_MODEL,
    ...(systemInstruction ? { systemInstruction } : {}),
  });
}

function getEmbeddingModel() {
  const ai = getGenAI();
  if (!ai) return null;
  return ai.getGenerativeModel({ model: "text-embedding-004" });
}

async function generateEmbedding(text) {
  if (!text || typeof text !== "string") {
    throw new Error("Text is required for embedding generation.");
  }

  const embeddingModel = getEmbeddingModel();
  if (!embeddingModel) {
    throw new Error("GEMINI_API_KEY is not configured for embeddings.");
  }

  const result = await embeddingModel.embedContent({
    content: { parts: [{ text }] },
  });

  if (!result?.embedding?.values) {
    throw new Error("Embedding generation failed.");
  }

  return result.embedding.values;
}

module.exports = { getModel, getEmbeddingModel, generateEmbedding, DEFAULT_CHAT_MODEL };
