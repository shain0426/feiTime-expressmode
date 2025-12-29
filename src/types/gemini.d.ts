// === 沖煮建議相關類型 ===

export interface GeminiRequest {
  roast: string; // 烘焙度，例如 "中焙"
  ratio: number; // 粉水比，例如 16
  brewTimeSec: number; // 沖煮時間（秒）
  grind: string; // 研磨度，例如 "中細"
  pours: number; // 注水段數
}

export interface GeminiResponse {
  text: string;
}

// === 咖啡小助手相關類型 ===

export interface CoffeeAssistantRequest {
  question: string; // 使用者的提問
  conversationHistory?: ConversationMessage[]; // 對話歷史（選填）
}

export interface CoffeeAssistantResponse {
  answer: string; // AI 的回答
}

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

// === Gemini 通用類型 ===

export interface GeminiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GeminiOptions {
  model?: string;
  maxRetries?: number;
  baseDelayMs?: number;
}
