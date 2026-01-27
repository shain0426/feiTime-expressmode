import type { Request, Response } from "express";
import { geminiText } from "@/services/geminiClient";
import type { GeminiMessage } from "@/types/gemini";

// === 類型定義 ===

interface FlavorProfile {
    sweetness: number;
    acidity: number;
    clarity: number;
    body: number;
    aftertaste: number;
}

interface FairyContext {
    origin: string;
    roast: string;
    grind: string;
    ratio: string;
    method: string;
    pourStages?: string;
    flavorProfile: FlavorProfile;
}

interface FairyRequest {
    mode: "select" | "adjust" | "chat";
    message?: string;
    context: FairyContext;
    history?: { role: "user" | "assistant"; content: string }[];
}

// === 輔助函數 ===

/**
 * 建構系統提示詞
 */
function buildSystemPrompt(context: FairyContext): string {
    const { origin, roast, grind, ratio, method, pourStages, flavorProfile } = context;

    return `你是「咖啡精靈」，一位友善且專業的咖啡沖煮顧問。

用戶當前的沖煮設定：
- 產地：${origin}
- 烘焙度：${roast}
- 研磨度：${grind}
- 粉水比：${ratio}
- 沖煮方式：${method}
${pourStages ? `- 注水段數：${pourStages}` : ""}

當前風味預測數據（滿分5分）：
- 甜度：${flavorProfile.sweetness.toFixed(1)}
- 酸度：${flavorProfile.acidity.toFixed(1)}
- 澄澈度：${flavorProfile.clarity.toFixed(1)}
- 醇厚度：${flavorProfile.body.toFixed(1)}
- 餘韻：${flavorProfile.aftertaste.toFixed(1)}

回覆規則：
1. 使用繁體中文回覆
2. 保持友善、親切的口吻
3. 回覆控制在 100 字以內
4. 提供具體可執行的建議
5. 可以用「✨」「☕」等符號增加親和力
6. 不要使用 Markdown 格式，純文字回覆`;
}

/**
 * 取得「幫我選」的用戶提示詞
 */
function getSelectPrompt(): string {
    return `請推薦一個適合日常飲用的均衡咖啡配方。
給出具體的產地、烘焙度、研磨度、粉水比建議，並簡單說明原因。`;
}

/**
 * 取得「幫我調整」的用戶提示詞
 */
function getAdjustPrompt(): string {
    return `根據我當前的沖煮設定與風味預測數據，請提供 1-2 個具體的優化建議，幫助我調整出更好的風味。`;
}

// === API Handlers ===

/**
 * 咖啡精靈建議 (幫我選 / 幫我調整)
 * POST /api/gemini/fairy/suggest
 */
export async function getFairySuggestion(req: Request, res: Response) {
    try {
        const { mode, context } = req.body as FairyRequest;

        if (!context) {
            return res.status(400).json({ error: "context is required" });
        }

        if (!mode || !["select", "adjust"].includes(mode)) {
            return res.status(400).json({ error: "mode must be 'select' or 'adjust'" });
        }

        const systemPrompt: GeminiMessage = {
            role: "system",
            content: buildSystemPrompt(context),
        };

        const userPrompt: GeminiMessage = {
            role: "user",
            content: mode === "select" ? getSelectPrompt() : getAdjustPrompt(),
        };

        const answer = await geminiText([systemPrompt, userPrompt], {
            model: "gemini-2.5-flash",
        });

        res.json({ answer: answer.trim() });
    } catch (error) {
        console.error("Fairy Suggestion Error:", error);
        res.status(500).json({
            error: "無法取得精靈建議",
            answer: "抱歉，我現在有點忙碌，請稍後再試 ☕",
        });
    }
}

/**
 * 咖啡精靈對話
 * POST /api/gemini/fairy/chat
 */
export async function chatWithFairy(req: Request, res: Response) {
    try {
        const { message, context, history = [] } = req.body as FairyRequest;

        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "message is required" });
        }

        if (!context) {
            return res.status(400).json({ error: "context is required" });
        }

        const systemPrompt: GeminiMessage = {
            role: "system",
            content: buildSystemPrompt(context),
        };

        // 建構對話歷史
        let conversationContent = "";
        if (history.length > 0) {
            conversationContent = "對話歷史：\n";
            // 只保留最近 6 條訊息
            const recentHistory = history.slice(-6);
            recentHistory.forEach((msg) => {
                const role = msg.role === "user" ? "用戶" : "精靈";
                conversationContent += `${role}：${msg.content}\n`;
            });
            conversationContent += "\n";
        }

        const userPrompt: GeminiMessage = {
            role: "user",
            content: `${conversationContent}用戶最新訊息：${message}`,
        };

        const answer = await geminiText([systemPrompt, userPrompt], {
            model: "gemini-2.5-flash",
        });

        res.json({ answer: answer.trim() });
    } catch (error) {
        console.error("Fairy Chat Error:", error);
        res.status(500).json({
            error: "對話發生錯誤",
            answer: "抱歉，我暫時無法回應，請稍後再試 ☕",
        });
    }
}
