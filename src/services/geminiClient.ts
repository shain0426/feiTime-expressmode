import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { GeminiMessage, GeminiOptions } from "@/types/gemini";

/** 建立 Gemini client */
export function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY in .env");
  return new GoogleGenAI({ apiKey });
}

/** 延遲函數 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 判斷是否可以重試 */
function isRetryableGeminiError(e: unknown): boolean {
  const msg = (e as Error)?.message ?? "";
  return (
    msg.includes('"code":503') ||
    msg.includes("The model is overloaded") ||
    msg.includes('"code":500') ||
    msg.includes('"code":504') ||
    msg.includes('"code":429')
  );
}

/** Gemini 文字生成函數 */
export async function geminiText(
  messages: GeminiMessage[],
  options: GeminiOptions = {}
): Promise<string> {
  const {
    model = "gemini-2.5-flash",
    maxRetries = 4,
    baseDelayMs = 800,
  } = options;
  const ai = createGeminiClient();
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // 將所有訊息組合成單一字串
      const prompt = messages.map((msg) => msg.content).join("\n\n");

      const response: GenerateContentResponse = await ai.models.generateContent(
        {
          model,
          contents: prompt,
        }
      );
      return response.text ?? "";
    } catch (e) {
      lastErr = e;
      const retryable = isRetryableGeminiError(e);
      const isLast = attempt === maxRetries;
      if (!retryable || isLast) throw e;
      const jitter = Math.floor(Math.random() * 250);
      const delay = baseDelayMs * Math.pow(2, attempt) + jitter;
      await sleep(delay);
    }
  }

  throw lastErr;
}
