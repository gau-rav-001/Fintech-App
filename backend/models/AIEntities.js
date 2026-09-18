const db = require("../config/db");

// ── AIConversation Model ──────────────────────────────────────────────────────

const CONVERSATION_COLS = `
  id, user_id, title, message_count, token_count, created_at, updated_at
`;

function formatConversation(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    messageCount: row.message_count,
    tokenCount: row.token_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

function toSafeUserId(id) {
  if (id && UUID_REGEX.test(id)) return id;
  return DEMO_USER_ID;
}

const AIConversation = {
  async findByUserId(userId, { limit = 50, offset = 0 } = {}) {
    const safeId = toSafeUserId(userId);
    const { rows } = await db.query(
      `SELECT ${CONVERSATION_COLS} FROM ai_conversations WHERE user_id = $1 
       ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
      [safeId, limit, offset]
    );
    return rows.map(formatConversation);
  },

  async findById(id) {
    if (!id || !UUID_REGEX.test(id)) return null;
    const { rows } = await db.query(
      `SELECT ${CONVERSATION_COLS} FROM ai_conversations WHERE id = $1`,
      [id]
    );
    return formatConversation(rows[0]);
  },

  async create(userId, title = "New Conversation") {
    const safeId = toSafeUserId(userId);
    const { rows } = await db.query(
      `INSERT INTO ai_conversations (user_id, title) VALUES ($1, $2) RETURNING ${CONVERSATION_COLS}`,
      [safeId, title]
    );
    return formatConversation(rows[0]);
  },

  async update(id, fields) {
    const allowed = {
      title: "title",
      messageCount: "message_count",
      tokenCount: "token_count",
    };

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const [jsKey, pgCol] of Object.entries(allowed)) {
      if (jsKey in fields && fields[jsKey] !== undefined) {
        setClauses.push(`${pgCol} = $${idx}`);
        values.push(fields[jsKey]);
        idx++;
      }
    }

    if (setClauses.length === 0) return AIConversation.findById(id);

    values.push(id);
    const { rows } = await db.query(
      `UPDATE ai_conversations SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING ${CONVERSATION_COLS}`,
      values
    );
    return formatConversation(rows[0]);
  },

  async incrementMessageCount(id, tokenCount = 0) {
    const { rows } = await db.query(
      `UPDATE ai_conversations 
       SET message_count = message_count + 1, token_count = token_count + $2
       WHERE id = $1 RETURNING ${CONVERSATION_COLS}`,
      [id, tokenCount]
    );
    return formatConversation(rows[0]);
  },

  async remove(id) {
    await db.query(`DELETE FROM ai_conversations WHERE id = $1`, [id]);
  },
};

// ── AIMessage Model ───────────────────────────────────────────────────────────

const MESSAGE_COLS = `
  id, conversation_id, role, content,
  prompt_tokens, completion_tokens, total_tokens,
  tool_calls, tool_results, model, created_at
`;

function formatMessage(row) {
  if (!row) return null;
  return {
    id: row.id,
    conversationId: row.conversation_id,
    role: row.role,
    content: row.content,
    promptTokens: row.prompt_tokens,
    completionTokens: row.completion_tokens,
    totalTokens: row.total_tokens,
    toolCalls: row.tool_calls || [],
    toolResults: row.tool_results || [],
    model: row.model,
    createdAt: row.created_at,
  };
}

const AIMessage = {
  async findByConversationId(conversationId, { limit = 100, offset = 0 } = {}) {
    const { rows } = await db.query(
      `SELECT ${MESSAGE_COLS} FROM ai_messages WHERE conversation_id = $1 
       ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
      [conversationId, limit, offset]
    );
    return rows.map(formatMessage);
  },

  async findById(id) {
    const { rows } = await db.query(
      `SELECT ${MESSAGE_COLS} FROM ai_messages WHERE id = $1`,
      [id]
    );
    return formatMessage(rows[0]);
  },

  async create(data) {
    const {
      conversationId, role, content,
      promptTokens, completionTokens, totalTokens,
      toolCalls, toolResults, model
    } = data;

    const { rows } = await db.query(
      `INSERT INTO ai_messages
         (conversation_id, role, content, 
          prompt_tokens, completion_tokens, total_tokens,
          tool_calls, tool_results, model)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${MESSAGE_COLS}`,
      [conversationId, role, content,
       promptTokens || 0, completionTokens || 0, totalTokens || 0,
       toolCalls ? JSON.stringify(toolCalls) : "[]",
       toolResults ? JSON.stringify(toolResults) : "[]",
       model || ""]
    );

    // Update conversation message count
    if (totalTokens > 0) {
      await AIConversation.incrementMessageCount(conversationId, totalTokens);
    }

    return formatMessage(rows[0]);
  },

  async remove(id) {
    await db.query(`DELETE FROM ai_messages WHERE id = $1`, [id]);
  },

  async removeByConversationId(conversationId) {
    await db.query(`DELETE FROM ai_messages WHERE conversation_id = $1`, [conversationId]);
  },
};

module.exports = { AIConversation, AIMessage };
