const test = require("node:test");
const assert = require("node:assert/strict");

function stub(path, exports) {
  const id = require.resolve(path);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
const messages = new Map();
const owners = new Map([["first", "user-a"], ["second", "user-b"]]);
stub("../models/AIEntities", {
  AIConversation: {findById: async id => ({id, userId: owners.get(id)})},
  AIMessage: {
    create: async message => { const list = messages.get(message.conversationId) || []; list.push(message); messages.set(message.conversationId, list); return { id: list.length }; },
    findByConversationId: async id => messages.get(id) || []
  }
});
stub("../ai/tools/financialTools", {});
stub("../ai/llm/gemini", {getModel: () => null});
let responses = 0;
stub("../ai/llm/providerClient", {callOllama: async () => "Response from local test provider " + ++responses});
stub("../ai/services/marketDataService", {getLiveStockQuote: async () => null});
stub("../ai/services/webSearchService", {getLiveGroundingContext: async () => null});
for (const key of ["GROQ_API_KEY", "GEMINI_API_KEY", "OPENROUTER_API_KEY"]) delete process.env[key];
process.env.OLLAMA_MODEL = "test-model";
process.env.AI_PROVIDER = "ollama";
const service = require("../ai/aiService");
test("user conversations keep independent answers for identical follow-ups", async () => {
  const a = await service.chat("user-a", "Explain amortization briefly", "first");
  const b = await service.chat("user-b", "Explain amortization briefly", "second");
  assert.match(a.content, /provider 1/);
  assert.match(b.content, /provider 2/);
});
test("foreign conversation is rejected before reading or writing messages", async () => {
  const before = messages.get("first")?.length;
  assert.ok((await service.chat("user-b", "Budget", "first")).error);
  assert.equal(messages.get("first")?.length, before);
});
