// src/app/services/aiService.ts
// ── AI Wealth Assistant API Client ────────────────────────────────────────────

const BASE = (import.meta as any).env?.VITE_API_URL || "/api";

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; message?: string; data: T }> {
  let res: Response;
  let json: any;

  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...options.headers },
      credentials: "include",
    });
  } catch (networkErr: any) {
    // Network failure (backend down, CORS, etc.)
    const err: any = new Error(
      networkErr?.message?.includes("fetch")
        ? "Cannot reach the server. Is the backend running on port 5000?"
        : networkErr?.message || "Network error"
    );
    err.status = 0;
    throw err;
  }

  try {
    json = await res.json();
  } catch {
    const err: any = new Error(`Server returned non-JSON response (HTTP ${res.status})`);
    err.status = res.status;
    throw err;
  }

  if (!res.ok) {
    const err: any = new Error(json?.message || `Request failed (${res.status})`);
    err.status  = res.status;
    err.data    = json;          // attach full response so caller can inspect
    err.code    = json?.errors?.code || json?.code;
    throw err;
  }

  return json;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  title: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface AIToolCall {
  name: string;
  params: Record<string, any>;
  result: any;
}

export interface AIChatResponse {
  conversationId: string;
  messageId: string;
  content: string;
  toolCalls?: AIToolCall[];
  suggestions?: string[];
}

export const aiAPI = {
  chat: (message: string, conversationId?: string) =>
    apiFetch<AIChatResponse>("/ai/chat", {
      method: "POST",
      body: JSON.stringify({ message, conversationId }),
    }),

  listConversations: () =>
    apiFetch<{ conversations: AIConversation[] }>("/ai/conversations"),

  getConversation: (id: string) =>
    apiFetch<{ conversation: AIConversation; messages: AIMessage[] }>(
      `/ai/conversations/${id}`
    ),

  deleteConversation: (id: string) =>
    apiFetch(`/ai/conversations/${id}`, { method: "DELETE" }),

  listTools: () =>
    apiFetch<{ tools: any[]; config: any }>("/ai/tools"),
};