import type { Request, Response } from "express";
import { geminiText } from "@/services/geminiClient";
import type { GeminiMessage } from "@/types/gemini";
import { strapiPost, fetchStrapiData } from "@/services/dataService";

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
    const messages: GeminiMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

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

    const messages: GeminiMessage[] = [
      {
        role: "user",
        content: prompt,
      },
    ];

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

/**
 * 將 brew_time 字串 (MM:SS) 轉換為秒數
 */
function parseBrewTime(timeStr: string): number {
  if (typeof timeStr === "number") return timeStr;
  const parts = timeStr.split(":");
  if (parts.length === 2) {
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
  }
  return parseInt(timeStr, 10) || 0;
}

/**
 * 將烘焙度/研磨度字串轉換為數字 (1-5)
 */
function parseRoastOrGrind(value: string | number): number {
  if (typeof value === "number") return value;
  // 根據關鍵字對應數字
  const str = value.toLowerCase();
  if (str.includes("light") || str.includes("淺")) return 1;
  if (str.includes("medium-light") || str.includes("中淺")) return 2;
  if (str.includes("medium") || str.includes("中")) return 3;
  if (str.includes("medium-dark") || str.includes("中深")) return 4;
  if (str.includes("dark") || str.includes("深")) return 5;
  // 細/中/粗 研磨
  if (str.includes("fine") || str.includes("細")) return 2;
  if (str.includes("coarse") || str.includes("粗")) return 4;
  return 3; // 預設中間值
}

/**
 * 保存沖煮報告卡片
 * POST /api/gemini/refine/save-log
 */
export async function saveBrewLog(req: Request, res: Response) {
  try {
    const { brewLog } = req.body;

    if (!brewLog) {
      return res.status(400).json({ error: "brewLog is required" });
    }

    // 轉換資料格式以符合 Strapi schema
    const strapiPayload = {
      ...brewLog,
      // 轉換 brew_time 為秒數
      brew_time: brewLog.brew_time ? parseBrewTime(brewLog.brew_time) : undefined,
      // 轉換烘焙度為數字
      bean_roast: brewLog.bean_roast ? parseRoastOrGrind(brewLog.bean_roast) : undefined,
      // 轉換研磨度為數字
      grind_level: brewLog.grind_level ? parseRoastOrGrind(brewLog.grind_level) : undefined,
      // ai_feedback 轉為 JSON 字串
      ai_feedback: brewLog.ai_feedback ? JSON.stringify(brewLog.ai_feedback) : undefined,
      // user 關聯需要用 set 語法 (Strapi v5)
      user: brewLog.user ? { set: [brewLog.user] } : undefined,
      // product 關聯 (如果有的話)
      product: brewLog.product ? { set: [brewLog.product] } : undefined,
    };

    console.log("📝 Saving brew log with data:", JSON.stringify(strapiPayload, null, 2));

    // 使用 strapiPost 寫入 brew-logs collection
    const result = await strapiPost("brew-logs", strapiPayload);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; response?: { data?: unknown } };
    console.error("Save Brew Log Error:", err);
    console.error("Strapi Error Details:", err.response?.data);
    res.status(500).json({
      error: "保存沖煮紀錄失敗",
      details: err.response?.data || err.message
    });
  }
}

/**
 * 取得用戶的沖煮記錄
 * GET /api/gemini/refine/logs
 */
export async function getBrewLogs(req: Request, res: Response) {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    // 使用 fetchStrapiData 查詢用戶的 brew-logs
    const data = await fetchStrapiData(
      "brew-logs",
      "*", // populate all relations
      1, // page
      100, // pageSize
      {
        filters: {
          user: {
            id: { $eq: Number(userId) },
          },
        },
        sort: ["createdAt:desc"],
        populate: ["user", "product"],
      },
    );

    res.json({ data });
  } catch (error) {
    console.error("Get Brew Logs Error:", error);
    res.status(500).json({ error: "取得沖煮記錄失敗" });
  }
}
