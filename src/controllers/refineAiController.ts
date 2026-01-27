import type { Request, Response } from "express";
import { geminiText } from "@/services/geminiClient";
import type { GeminiMessage } from "@/types/gemini";

/**
 * 取得 Refine Simulator 即時建議
 * POST /api/gemini/refine/advice
 */
export async function getRefineAdvice(req: Request, res: Response) {
    try {
        const { brewState } = req.body;
        if (!brewState) {
            return res.status(400).json({ error: "brewState is required" });
        }

        const simplifiedState = req.body.brewState || brewState;

        // Restore EXACT original prompt format
        const prompt = `
      Context: Real-time pour-over coffee brewing coach.
      Current State: ${JSON.stringify(simplifiedState)}
      Task: Provide 1 brief command (action) and 1 brief reason for the user to optimize their brew right now.
      Constraint: Keep "action" under 15 words. Keep "reason" under 15 words.
      Output JSON: { "action": "...", "reason": "..." }
      Language: Traditional Chinese (Taiwan).
    `;

        // Use a single message to match original behavior
        const messages: GeminiMessage[] = [{
            role: "user",
            content: prompt
        }];

        const text = await geminiText(messages, {
            model: "gemini-2.5-flash", // AI Coach 即時指導
        });

        // 嘗試解析 JSON (Gemini 有時會回傳 markdown code block)
        const cleanText = text.replace(/```json|```/g, "").trim();
        const json = JSON.parse(cleanText);

        res.json(json);
    } catch (error) {
        console.error("Refine Advice Error:", error);
        // 回傳預設錯誤結構保持前端正常
        res.json({ action: "連線錯誤", reason: "無法取得 AI 建議" });
    }
}

/**
 * 取得 Refine Simulator 沖煮報告
 * POST /api/gemini/refine/report
 */
export async function getRefineReport(req: Request, res: Response) {
    try {
        const { finalConfig, logStr } = req.body;

        // 如果前端傳來的是 array，這裡先轉 string，或前端傳 string 均可。
        // 假設前端傳 string (符合目前前端邏輯)

        const prompt = `
      Role: Coffee Brewing Expert.
      Analyze this session.
      Final Config: ${JSON.stringify(finalConfig)}
      Session Log (T=Time Sec, W=Water ml, Ph=Phase):
      ${logStr}
      
      Output JSON (Traditional Chinese Taiwan):
      {
        "summary": "One sentence summary of the brew quality (e.g. over-extracted, unbalanced, or perfect).",
        "top_issues": ["Issue 1 with timestamp evidence", "Issue 2..."],
        "next_attempt_plan": ["Step 1", "Step 2", "Step 3"],
        "taste_prediction": "Describe flavor notes (e.g. bitter, sour, sweet, body)."
      }
    `;

        const messages: GeminiMessage[] = [{
            role: "user",
            content: prompt
        }];

        const text = await geminiText(messages, {
            model: "gemini-3-flash-preview", // User specified: Consolidate to Flash
        });

        const cleanText = text.replace(/```json|```/g, "").trim();
        const json = JSON.parse(cleanText);

        res.json(json);

    } catch (error) {
        console.error("Refine Report Error:", error);
        res.status(500).json({ error: "Report generation failed" });
    }
}
