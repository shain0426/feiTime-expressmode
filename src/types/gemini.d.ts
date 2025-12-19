export interface GeminiRequest {
  prompt: string;
}

export interface GeminiResponse {
  text: string;
}

export interface GeminiOptions {
  model?: string;
  maxRetries?: number;
  baseDelayMs?: number;
}
