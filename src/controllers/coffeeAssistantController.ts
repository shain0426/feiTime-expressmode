import type { Request, Response } from "express";
import { geminiText } from "@/services/geminiClient";
import { fetchStrapiData } from "@/services/dataService";
import { GeminiMessage, CoffeeAssistantRequest } from "@/types/gemini";

/**
 * 對話階段定義
 */
enum ConversationStage {
  INITIAL = "initial", // 初始階段：詢問風味偏好
  FLAVOR_SELECTED = "flavor_selected", // 已選風味：詢問細節偏好
  READY_TO_RECOMMEND = "ready_to_recommend", // 準備推薦：撈取並推薦產品
}

/**
 * 用戶偏好資料結構
 */
interface UserPreferences {
  flavorCategory?: "fruity" | "floral" | "nutty" | "bold";
  acidity?: "high" | "medium" | "low";
  price?: { min?: number; max?: number; budget?: number };
  roast?: "Light" | "Medium" | "Dark";
  origin?: string;
  specificName?: string; // 指定品種/品名
}

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
  searchName?: string;
  sortBy?: string;
}) {
  const filters: Record<string, any> = {};

  if (query.searchName) {
    filters.name = { $containsi: query.searchName };
  }

  if (query.category && !query.searchName) {
    filters.flavor_type = { $eq: query.category };
  }

  if (query.minAcidity !== undefined || query.maxAcidity !== undefined) {
    filters.acidity = {};
    if (query.minAcidity !== undefined) filters.acidity.$gte = query.minAcidity;
    if (query.maxAcidity !== undefined) filters.acidity.$lte = query.maxAcidity;
  }

  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filters.price = {};
    if (query.minPrice !== undefined) filters.price.$gte = query.minPrice;
    if (query.maxPrice !== undefined) filters.price.$lte = query.maxPrice;
  }

  if (query.origin) {
    filters.origin = { $eq: query.origin };
  }

  if (query.roast) {
    filters.roast = { $eq: query.roast };
  }

  const products = await fetchStrapiData(
    "products",
    "*",
    1,
    query.limit || 100,
    {
      filters,
      sort: [query.sortBy || "price:desc"],
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
        "variety",
      ],
    }
  );

  return query.limit ? products.slice(0, query.limit) : products;
}

/**
 * 從對話歷史中提取用戶偏好
 */
function extractPreferencesFromHistory(
  conversationHistory: GeminiMessage[]
): UserPreferences {
  const prefs: UserPreferences = {};
  const allText = conversationHistory
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.content)
    .join(" ")
    .toLowerCase();

  // 提取風味偏好
  if (
    allText.includes("果") ||
    allText.includes("酸") ||
    allText.includes("fruity")
  ) {
    prefs.flavorCategory = "fruity";
  } else if (
    allText.includes("花") ||
    allText.includes("香") ||
    allText.includes("floral")
  ) {
    prefs.flavorCategory = "floral";
  } else if (
    allText.includes("堅果") ||
    allText.includes("巧克力") ||
    allText.includes("平衡") ||
    allText.includes("nutty")
  ) {
    prefs.flavorCategory = "nutty";
  } else if (
    allText.includes("濃") ||
    allText.includes("厚") ||
    allText.includes("苦") ||
    allText.includes("bold")
  ) {
    prefs.flavorCategory = "bold";
  }

  // 提取酸度偏好
  if (allText.includes("高酸") || allText.includes("明亮")) {
    prefs.acidity = "high";
  } else if (allText.includes("低酸") || allText.includes("不酸")) {
    prefs.acidity = "low";
  } else if (allText.includes("中酸") || allText.includes("適中")) {
    prefs.acidity = "medium";
  }

  // 提取價格偏好
  const priceMatch = allText.match(/(\d+)\s*[元塊]/);
  if (priceMatch) {
    prefs.price = { budget: Number(priceMatch[1]) };
  } else if (allText.includes("便宜") || allText.includes("平價")) {
    prefs.price = { max: 500 };
  } else if (allText.includes("頂級") || allText.includes("高級")) {
    prefs.price = { min: 1000 };
  }

  // 提取烘焙度
  if (allText.includes("淺焙")) {
    prefs.roast = "Light";
  } else if (allText.includes("中焙")) {
    prefs.roast = "Medium";
  } else if (allText.includes("深焙")) {
    prefs.roast = "Dark";
  }

  // 提取產地
  const origins = [
    { english: "Ethiopia", chinese: ["衣索比亞", "埃塞俄比亞"] },
    { english: "Kenya", chinese: ["肯亞", "肯尼亞"] },
    { english: "Colombia", chinese: ["哥倫比亞"] },
    { english: "Brazil", chinese: ["巴西"] },
    { english: "Panama", chinese: ["巴拿馬"] },
    { english: "Indonesia", chinese: ["印尼"] },
  ];

  for (const { english, chinese } of origins) {
    if (
      allText.includes(english.toLowerCase()) ||
      chinese.some((name) => allText.includes(name))
    ) {
      prefs.origin = english;
      break;
    }
  }

  // 提取特定品種
  const varieties = [
    { keywords: ["geisha", "藝伎", "瑰夏"], name: "geisha" },
    { keywords: ["bourbon", "波旁"], name: "bourbon" },
    { keywords: ["曼特寧", "mandheling"], name: "mandheling" },
    { keywords: ["耶加雪菲", "yirgacheffe"], name: "yirgacheffe" },
  ];

  for (const { keywords, name } of varieties) {
    if (keywords.some((kw) => allText.includes(kw))) {
      prefs.specificName = name;
      break;
    }
  }

  return prefs;
}

/**
 * 判斷當前對話階段
 */
function determineConversationStage(
  question: string,
  conversationHistory: GeminiMessage[],
  prefs: UserPreferences
): ConversationStage {
  const lowerQuestion = question.toLowerCase();

  // 如果用戶明確指定特定品種或提供完整需求，直接進入推薦階段
  if (
    prefs.specificName ||
    (prefs.flavorCategory && (prefs.acidity || prefs.price || prefs.roast))
  ) {
    return ConversationStage.READY_TO_RECOMMEND;
  }

  // 如果已經選擇風味分類，進入細節詢問階段
  if (prefs.flavorCategory) {
    return ConversationStage.FLAVOR_SELECTED;
  }

  // 初始階段：需要詢問風味偏好
  return ConversationStage.INITIAL;
}

/**
 * 建構查詢參數
 */
function buildSearchQuery(prefs: UserPreferences): any {
  const query: any = { limit: 5 };

  if (prefs.specificName) {
    query.searchName = prefs.specificName;
    delete query.limit;
    return query;
  }

  if (prefs.flavorCategory) {
    query.category = prefs.flavorCategory;
  }

  // 酸度對應
  if (prefs.acidity === "high") {
    query.minAcidity = 4;
  } else if (prefs.acidity === "low") {
    query.maxAcidity = 3;
  } else if (prefs.acidity === "medium") {
    query.minAcidity = 3;
    query.maxAcidity = 4;
  }

  // 價格對應
  if (prefs.price) {
    if (prefs.price.budget) {
      query.maxPrice = prefs.price.budget + 100;
    }
    if (prefs.price.min) query.minPrice = prefs.price.min;
    if (prefs.price.max) query.maxPrice = prefs.price.max;
  }

  if (prefs.roast) {
    query.roast = prefs.roast;
  }

  if (prefs.origin) {
    query.origin = prefs.origin;
  }

  return query;
}

export async function coffeeAssistantHandler(req: Request, res: Response) {
  try {
    const { question, conversationHistory = [] } =
      req.body as CoffeeAssistantRequest;

    if (!question || typeof question !== "string") {
      return res.status(400).json({
        error: "請提供有效的問題",
      });
    }

    // 從對話歷史中提取用戶偏好
    const prefs = extractPreferencesFromHistory([
      ...conversationHistory,
      { role: "user", content: question },
    ]);

    // 判斷當前對話階段
    const stage = determineConversationStage(
      question,
      conversationHistory,
      prefs
    );

    let productContext = "";
    let stageInstruction = "";

    // 根據階段決定 AI 的行為
    switch (stage) {
      case ConversationStage.INITIAL:
        stageInstruction = `
【當前階段】初次詢問 - 需要了解風味偏好

請用親切的方式詢問顧客喜歡哪種風味類型：
🌸 花香調 (Floral) - 茉莉、玫瑰、柑橘花香
🍒 果酸調 (Fruity) - 莓果、柑橘、水果風味
🥜 堅果調 (Nutty) - 巧克力、堅果、焦糖
💪 濃郁調 (Bold) - 厚實醇厚、深焙煙燻

用1-2句話簡單說明各類型特色，讓顧客選擇。
`;
        break;

      case ConversationStage.FLAVOR_SELECTED:
        stageInstruction = `
【當前階段】已選風味 - 詢問細節偏好

顧客已選擇「${prefs.flavorCategory}」風味，請進一步詢問：
1. 酸度偏好：喜歡明亮的高酸？還是柔和的低酸？
2. 預算範圍：大約多少價位？
3. 烘焙度：偏好淺焙、中焙還是深焙？

不要一次問太多，選擇2個最相關的問題即可。
`;
        break;

      case ConversationStage.READY_TO_RECOMMEND:
        // 執行商品查詢
        try {
          const searchQuery = buildSearchQuery(prefs);
          const products = await searchCoffeeForAssistant(searchQuery);

          if (products && products.length > 0) {
            productContext = `\n\n【店內符合商品: ${products.length}款】\n`;
            products.forEach((p: any, i: number) => {
              const a = p.attributes || p;
              productContext += `${i + 1}. ${a.name} | ${a.origin} | ${
                a.roast
              } | ${a.flavor_type}\n`;
              productContext += `   酸度${a.acidity} 甜度${a.sweetness} 醇厚${a.body} | $${a.price}\n`;
              const desc = a.description?.substring(0, 60) || "";
              if (desc) productContext += `   ${desc}...\n`;
            });

            stageInstruction = `
【當前階段】推薦產品

根據顧客偏好（${JSON.stringify(
              prefs
            )}），從上方「店內商品」中推薦2-3款最適合的產品。

推薦格式：
- 使用 <strong>產品名稱</strong> 標示
- 說明為什麼適合（連結到顧客提到的偏好）
- 標註價格和關鍵風味特點
- 用親切的語氣，像是在咖啡店推薦豆子給朋友

⚠️ 只推薦上方列出的店內實際販售商品
⚠️ 絕不提及其他品牌或店外產品

如果顧客還想看更多，可以詢問是否要調整條件。
`;
          } else {
            // 嘗試放寬條件查詢相近產品
            const relaxedQuery = { ...searchQuery };
            delete relaxedQuery.minAcidity;
            delete relaxedQuery.maxAcidity;
            if (relaxedQuery.maxPrice) {
              relaxedQuery.maxPrice += 200;
            }

            const alternativeProducts = await searchCoffeeForAssistant(
              relaxedQuery
            );

            if (alternativeProducts && alternativeProducts.length > 0) {
              productContext = `\n\n【店內相近商品: ${alternativeProducts.length}款】\n`;
              alternativeProducts.slice(0, 3).forEach((p: any, i: number) => {
                const a = p.attributes || p;
                productContext += `${i + 1}. ${a.name} | ${a.origin} | ${
                  a.roast
                } | ${a.flavor_type}\n`;
                productContext += `   酸度${a.acidity} 甜度${a.sweetness} 醇厚${a.body} | $${a.price}\n`;
                const desc = a.description?.substring(0, 60) || "";
                if (desc) productContext += `   ${desc}...\n`;
              });
            }

            stageInstruction = `
【當前階段】推薦產品（無完全符合）

店內目前沒有完全符合所有條件的產品。請：
1. 誠實告知：「目前店內沒有完全符合所有條件的款式」
2. 推薦上方列出的「店內相近商品」（說明哪些條件相符，哪些稍有不同）
3. 詢問顧客是否願意調整某個條件（如放寬價格、酸度範圍等）

⚠️ 絕對不要推薦其他品牌或店外產品
⚠️ 只推薦上方列出的店內實際商品
`;
          }
        } catch (searchErr) {
          console.error("商品查詢錯誤:", searchErr);
          stageInstruction = `查詢商品時發生錯誤，請先回答顧客的問題，不提供具體產品推薦。`;
        }
        break;
    }

    // System Prompt
    const systemPrompt: GeminiMessage = {
      role: "system",
      content:
        `你是我們咖啡店的專業咖啡顧問，協助顧客從「店內現有商品」中找到合適的咖啡豆。

【重要限制】
⚠️ 只能推薦店內實際販售的產品（會在對話中提供）
⚠️ 絕不推薦其他品牌或店外產品
⚠️ 如果店內沒有符合的商品，引導顧客調整需求或推薦相近的店內替代品

【核心原則】
- 循序漸進：先問風味偏好 → 再問細節 → 最後推薦
- 不要一次問太多問題（最多2個）
- 用親切、自然的語氣，像朋友聊天
- 回答簡潔，5-8句話內

【風味分類】
🌸 Floral-花香調 | 🍒 Fruity-果酸調 | 🥜 Nutty-堅果調 | 💪 Bold-濃郁調

【回答格式】使用HTML格式：
- <strong>粗體</strong>標示重點
- <br>換行
- emoji 增加親和力

${stageInstruction}
`.trim(),
    };

    // User Prompt
    let userContent = "";

    if (conversationHistory.length > 0) {
      userContent += "對話歷史：\n";
      conversationHistory.slice(-4).forEach((msg) => {
        // 只保留最近4輪對話
        const role = msg.role === "user" ? "顧客" : "助手";
        userContent += `${role}: ${msg.content}\n`;
      });
      userContent += "\n";
    }

    if (productContext) {
      userContent += productContext + "\n";
    }

    userContent += `顧客最新訊息: ${question}`;

    const userPrompt: GeminiMessage = {
      role: "user",
      content: userContent,
    };

    // 呼叫 Gemini API
    const answer = await geminiText([systemPrompt, userPrompt]);

    res.json({
      answer: answer.trim(),
      debug: {
        stage,
        preferences: prefs,
        hasProducts: !!productContext,
      },
    });
  } catch (err) {
    console.error("咖啡小助手 API 錯誤:", err);
    res.status(500).json({
      error: "抱歉，AI 助手目前遇到問題，請稍後再試",
      answer: "抱歉，我現在有點忙不過來 😅 請稍後再試，或直接聯繫我們的客服！",
    });
  }
}
