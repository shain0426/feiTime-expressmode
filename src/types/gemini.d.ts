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

export interface GeminiMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GeminiOptions {
  model?: string;
  maxRetries?: number;
  baseDelayMs?: number;
}
