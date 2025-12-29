import type { Request, Response } from "express";
import { geminiText } from "@/services/geminiClient";
import { fetchStrapiData } from "@/services/dataService";
import { GeminiMessage, CoffeeAssistantRequest } from "@/types/gemini";

/**
 * 內部函數：根據用戶需求搜尋咖啡豆
 */
async function searchCoffeeForAssistant(query: {
  category?: "fruity" | "floral" | "nutty" | "bold";
  minAcidity?: number;
  maxAcidity?: number;
  minPrice?: number;
  maxPrice?: number;
  origin?: string;
  roast?: string;
  limit?: number;
}) {
  const filters: Record<string, any> = {};

  // 風味分類
  if (query.category) {
    filters.flavor_type = { $eq: query.category };
  }

  // 酸度範圍
  if (query.minAcidity !== undefined || query.maxAcidity !== undefined) {
    filters.acidity = {};
    if (query.minAcidity !== undefined) filters.acidity.$gte = query.minAcidity;
    if (query.maxAcidity !== undefined) filters.acidity.$lte = query.maxAcidity;
  }

  // 價格範圍
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filters.price = {};
    if (query.minPrice !== undefined) filters.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filters.price.$lte = query.maxPrice;
  }

  // 產地
  if (query.origin) {
    filters.origin = { $eq: query.origin };
  }

  // 烘焙度
  if (query.roast) {
    filters.roast = { $eq: query.roast };
  }

  // 查詢 Strapi
  const products = await fetchStrapiData(
    "products",
    "*",
    1,
    query.limit || 100,
    {
      filters,
      sort: ["popularity:desc"], // 按熱門度排序
      fields: [
        "id",
        "name",
        "origin",
        "roast",
        "processing",
        "flavor_type",
        "acidity",
        "sweetness",
        "body",
        "price",
        "description",
      ],
    }
  );

  return query.limit ? products.slice(0, query.limit) : products;
}

export async function coffeeAssistantHandler(req: Request, res: Response) {
  try {
    const { question, conversationHistory = [] } =
      req.body as CoffeeAssistantRequest;

    // 驗證輸入
    if (!question || typeof question !== "string") {
      return res.status(400).json({
        error: "請提供有效的問題",
      });
    }

    // 分析用戶意圖，決定是否需要查詢商品
    let productContext = "";
    const lowerQuestion = question.toLowerCase();

    // 判斷是否需要查詢商品
    const needsProductSearch =
      lowerQuestion.includes("推薦") ||
      lowerQuestion.includes("找") ||
      lowerQuestion.includes("有什麼") ||
      lowerQuestion.includes("有哪些") ||
      lowerQuestion.includes("想要") ||
      lowerQuestion.includes("預算") ||
      lowerQuestion.includes("價格") ||
      lowerQuestion.includes("便宜") ||
      lowerQuestion.includes("貴");

    if (needsProductSearch) {
      try {
        // 根據關鍵字判斷查詢條件
        const searchQuery: any = { limit: 5 };

        // 風味偏好判斷
        if (lowerQuestion.includes("酸") || lowerQuestion.includes("果")) {
          searchQuery.category = "fruity";
          searchQuery.minAcidity = 4;
        } else if (
          lowerQuestion.includes("花") ||
          lowerQuestion.includes("香")
        ) {
          searchQuery.category = "floral";
        } else if (
          lowerQuestion.includes("巧克力") ||
          lowerQuestion.includes("堅果") ||
          lowerQuestion.includes("平衡")
        ) {
          searchQuery.category = "nutty";
        } else if (
          lowerQuestion.includes("濃") ||
          lowerQuestion.includes("厚") ||
          lowerQuestion.includes("苦") ||
          lowerQuestion.includes("深焙")
        ) {
          searchQuery.category = "bold";
        }

        // 烘焙度判斷
        if (lowerQuestion.includes("淺焙")) {
          searchQuery.roast = "Light";
        } else if (lowerQuestion.includes("中焙")) {
          searchQuery.roast = "Medium";
        } else if (lowerQuestion.includes("深焙")) {
          searchQuery.roast = "Dark";
        }

        // 價格判斷
        if (lowerQuestion.includes("便宜") || lowerQuestion.includes("平價")) {
          searchQuery.maxPrice = 500;
        } else if (lowerQuestion.match(/\d+元/)) {
          const priceMatch = lowerQuestion.match(/(\d+)元/);
          if (priceMatch) {
            const budget = Number(priceMatch[1]);
            searchQuery.maxPrice = budget + 50; // 給一點彈性
          }
        }

        // 產地判斷
        const origins = [
          "Ethiopia",
          "Kenya",
          "Colombia",
          "Brazil",
          "Panama",
          "Indonesia",
        ];
        for (const origin of origins) {
          if (
            lowerQuestion.includes(origin.toLowerCase()) ||
            lowerQuestion.includes(origin === "Ethiopia" ? "衣索比亞" : "") ||
            lowerQuestion.includes(origin === "Kenya" ? "肯亞" : "") ||
            lowerQuestion.includes(origin === "Colombia" ? "哥倫比亞" : "") ||
            lowerQuestion.includes(origin === "Brazil" ? "巴西" : "") ||
            lowerQuestion.includes(origin === "Panama" ? "巴拿馬" : "") ||
            lowerQuestion.includes(origin === "Indonesia" ? "印尼" : "")
          ) {
            searchQuery.origin = origin;
            break;
          }
        }

        // 查詢商品
        const products = await searchCoffeeForAssistant(searchQuery);

        if (products && products.length > 0) {
          productContext = `\n\n【商品資料庫查詢結果】\n找到 ${products.length} 款符合條件的咖啡豆：\n`;
          products.forEach((p: any, index: number) => {
            productContext += `\n${index + 1}. ${p.name || p.attributes?.name}`;
            productContext += `\n   - 產地：${
              p.origin || p.attributes?.origin
            }`;
            productContext += `\n   - 烘焙度：${
              p.roast || p.attributes?.roast
            }`;
            productContext += `\n   - 風味：${
              p.flavor_type || p.attributes?.flavor_type
            }`;
            productContext += `\n   - 酸度：${
              p.acidity || p.attributes?.acidity
            }/5`;
            productContext += `\n   - 甜度：${
              p.sweetness || p.attributes?.sweetness
            }/5`;
            productContext += `\n   - 價格：$${p.price || p.attributes?.price}`;
            productContext += `\n   - 描述：${
              p.description || p.attributes?.description
            }`;
            productContext += `\n`;
          });
          productContext += `\n請根據以上商品資料，推薦 2-3 款最適合顧客的咖啡豆，並說明推薦理由。\n`;
        }
      } catch (searchErr) {
        console.error("商品查詢錯誤:", searchErr);
        // 查詢失敗不影響主流程，繼續回答
      }
    }

    // System Prompt - 定義咖啡小助手的角色
    const systemPrompt: GeminiMessage = {
      role: "system",
      content: `
你是一位專業且友善的咖啡小助手，專門協助顧客了解咖啡相關知識並推薦適合的咖啡豆。

# 你的職責
1. **咖啡豆推薦**：根據顧客的口味偏好推薦適合的咖啡豆
2. **沖煮建議**：提供最佳沖煮參數（研磨度、粉水比、水溫、時間）
3. **風味說明**：解釋咖啡的風味特性、產地特色、烘焙程度差異
4. **器具建議**：推薦適合的咖啡器具和使用技巧
5. **咖啡知識**：回答關於咖啡文化、處理法、品種等問題

# 商品資料庫
我們有 58 款精品咖啡豆，分為四大風味分類：
- 🌸 **Floral（花香明亮）**：優雅茶感、花香調性
- 🍒 **Fruity（果香清爽）**：明亮果酸、莓果調性
- 🥜 **Nutty（堅果巧克力）**：平衡順口、可可堅果調性
- 💪 **Bold（濃郁厚實）**：深焙濃郁、厚重口感

價格範圍：$350 - $2000

# 推薦原則
1. **如果系統提供了商品查詢結果**，請從中挑選 2-3 款最適合的推薦給顧客
2. **推薦時必須包含**：咖啡豆名稱、價格、風味特點、為什麼適合該顧客
3. **如果沒有商品查詢結果**，根據經驗推薦風味類型和特性即可
4. **適時詢問更多細節**以提供更精準的建議

# 回答原則
- 使用繁體中文，語氣親切專業
- 回答簡潔明瞭，一般控制在 5-8 句話內
- 推薦時說明理由
- 如果問題超出咖啡範疇，禮貌地引導回咖啡話題
      `.trim(),
    };

    // User Prompt - 組合對話歷史、商品資料與當前問題
    let userContent = "";

    // 加入對話歷史
    if (conversationHistory.length > 0) {
      userContent += "對話歷史：\n";
      conversationHistory.forEach((msg) => {
        const role = msg.role === "user" ? "顧客" : "小助手";
        userContent += `${role}: ${msg.content}\n`;
      });
      userContent += "\n";
    }

    // 加入商品查詢結果（如果有）
    if (productContext) {
      userContent += productContext;
    }

    // 加入當前問題
    userContent += `顧客: ${question}`;

    const userPrompt: GeminiMessage = {
      role: "user",
      content: userContent,
    };

    // 呼叫 Gemini API
    const answer = await geminiText([systemPrompt, userPrompt]);

    // 回傳結果
    res.json({
      answer: answer.trim(),
    });
  } catch (err) {
    console.error("咖啡小助手 API 錯誤:", err);
    res.status(500).json({
      error: "抱歉，AI 助手目前遇到問題，請稍後再試",
      answer: "抱歉，我現在有點忙不過來 😅 請稍後再試，或直接聯繫我們的客服！",
    });
  }
}
