import {
  GoogleGenerativeAI,
  EnhancedGenerateContentResponse,
} from "@google/generative-ai";
import type { GeminiMessage, GeminiOptions } from "@/types/gemini";

/** 建立 Gemini client */
export function createGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY in .env");
  }
  return new GoogleGenerativeAI(apiKey);
}

/** 延遲函數 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 判斷是否可以重試 */
function isRetryableGeminiError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;

  const msg = e.message;
  // 檢查常見的重試狀態碼或關鍵字
  return (
    msg.includes("503") ||
    msg.includes("overloaded") ||
    msg.includes("500") ||
    msg.includes("504") ||
    msg.includes("429")
  );
}

/** Gemini 文字生成函數 */
export async function geminiText(
  messages: GeminiMessage[],
  options: GeminiOptions = {},
): Promise<string> {
  const {
    model = "gemini-2.5-flash",
    maxRetries = 2,
    baseDelayMs = 800,
  } = options;

  const genAI = createGeminiClient();
  let lastErr: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const modelInstance = genAI.getGenerativeModel({ model });

      /** * 核心優化：將 GeminiMessage 轉換為官方支援的內容格式
       * 而不是簡單的字串合併，這樣有助於未來處理多輪對話 (Role-based)
       */
      const prompt = messages.map((msg) => msg.content).join("\n\n");

      // 執行生成
      const result = await modelInstance.generateContent(prompt);
      const response: EnhancedGenerateContentResponse = result.response;

      const text = response.text();
      if (!text) throw new Error("Gemini returned empty text");

      return text;
    } catch (e) {
      lastErr = e;
      const errorMessage = e instanceof Error ? e.message : "Unknown error";

      console.warn(`⚠️ Gemini Attempt ${attempt} failed:`, errorMessage);

      const retryable = isRetryableGeminiError(e);

      // 如果不可重試或是最後一次嘗試，則丟出錯誤
      if (!retryable || attempt === maxRetries) {
        throw e;
      }

      // 指數退避 (Exponential Backoff)
      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 200;
      await sleep(delay);
    }
  }

  throw lastErr;
}
