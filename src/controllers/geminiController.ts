import type { Request, Response } from "express";
import { geminiText } from "@/services/geminiClient";
import { GeminiMessage, GeminiRequest, GeminiResponse } from "@/types/gemini";

export async function geminiHandler(req: Request, res: Response) {
  try {
    const params = req.body as GeminiRequest;
    if (!params || typeof params !== "object") {
      return res.status(400).json({ error: "params (JSON) is required" });
    }

    // system prompt 控制回覆規則
    const systemPrompt: GeminiMessage = {
      role: "system",
      content: `
        你是一位專業咖啡師。
        收到的手沖參數為 JSON。
        請生成自然語言建議：
        - 150字以內
        - 使用 Markdown 條列
        - 包含「風味判斷」與「調整建議」
        - 文字精簡、像咖啡師口吻
      `,
    };

    // user prompt 直接傳 JSON
    const userPrompt: GeminiMessage = {
      role: "user",
      content: JSON.stringify(params),
    };

    const text = await geminiText([systemPrompt, userPrompt]);

    res.json({ text });
  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Gemini failed" });
  }
}
