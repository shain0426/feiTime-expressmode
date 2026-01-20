import type { Request, Response } from "express";
import { geminiText } from "@/services/geminiClient";
import { fetchStrapiData, StrapiFilters } from "@/services/dataService";
import { GeminiMessage, CoffeeAssistantRequest } from "@/types/gemini";

/**
 * 對話階段定義
 */
enum ConversationStage {
  INITIAL = "initial", // 初始階段:詢問風味偏好
  FLAVOR_SELECTED = "flavor_selected", // 已選風味:詢問細節偏好
  READY_TO_RECOMMEND = "ready_to_recommend", // 準備推薦:撈取並推薦產品
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
  specialSort?: "most_expensive" | "cheapest" | "most_popular"; // 特殊排序需求
}

/**
 * 咖啡產品資料結構
 */
interface CoffeeProduct {
  id?: number;
  attributes?: {
    name: string;
    origin: string;
    roast: string;
    flavor_tags: string[] | string;
    acidity: number;
    sweetness: number;
    body: number;
    price: number;
    description?: string;
  };
  // 如果是直接從 Strapi 取得的扁平結構
  name?: string;
  origin?: string;
  roast?: string;
  flavor_tags?: string[] | string;
  acidity?: number;
  sweetness?: number;
  body?: number;
  price?: number;
  description?: string;
}

/**
 * 搜尋查詢參數結構
 */
interface SearchQueryParams {
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
}

/**
 * 內部函數:根據用戶需求搜尋咖啡豆
 */
async function searchCoffeeForAssistant(query: SearchQueryParams) {
  const filters: StrapiFilters = {};

  if (query.searchName) {
    filters.name = { $containsi: query.searchName };
  }

  if (query.category && !query.searchName) {
    // 使用 flavor_type 篩選(字串欄位,首字母大寫)
    const categoryMap: Record<string, string> = {
      fruity: "Fruity",
      floral: "Floral",
      nutty: "Nutty",
      bold: "Bold",
    };
    filters.flavor_type = { $eq: categoryMap[query.category] };
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

  // 提取特殊排序需求
  if (
    allText.includes("最貴") ||
    allText.includes("價格最高") ||
    allText.includes("最高級") ||
    allText.includes("最頂級")
  ) {
    prefs.specialSort = "most_expensive";
  } else if (
    allText.includes("最便宜") ||
    allText.includes("價格最低") ||
    allText.includes("最平價") ||
    allText.includes("最實惠")
  ) {
    prefs.specialSort = "cheapest";
  } else if (
    allText.includes("最受歡迎") ||
    allText.includes("最熱門") ||
    allText.includes("人氣最高") ||
    allText.includes("賣最好")
  ) {
    prefs.specialSort = "most_popular";
  }

  return prefs;
}

/**
 * 分析對話歷史以優化體驗
 */
function analyzeConversationContext(conversationHistory: GeminiMessage[]) {
  // 計算 AI 已經詢問的次數
  const aiQuestionCount = conversationHistory.filter(
    (msg) => msg.role === "assistant" && msg.content.includes("?")
  ).length;

  // 獲取所有用戶訊息
  const userMessages = conversationHistory
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.content.toLowerCase());

  // 檢測客戶是否表達不耐煩或想快速獲得推薦
  const showsImpatience = userMessages.some(
    (msg) =>
      msg.includes("隨便") ||
      msg.includes("不知道") ||
      msg.includes("都可以") ||
      msg.includes("快點") ||
      msg.includes("直接推薦") ||
      msg.includes("給我推薦")
  );

  // 檢測是否為專家型客戶（使用專業術語）
  const expertKeywords = [
    "處理法",
    "日曬",
    "水洗",
    "蜜處理",
    "厭氧",
    "發酵",
    "cupping",
    "sca",
    "精品",
    "單品",
    "批次",
    "莊園",
  ];
  const isExpert = userMessages.some((msg) =>
    expertKeywords.some((kw) => msg.includes(kw))
  );

  // 檢查 AI 已詢問過的主題
  const assistantMessages = conversationHistory
    .filter((msg) => msg.role === "assistant")
    .map((msg) => msg.content.toLowerCase());

  const askedAboutAcidity = assistantMessages.some(
    (msg) => msg.includes("酸度") || msg.includes("明亮")
  );

  const askedAboutPrice = assistantMessages.some(
    (msg) =>
      msg.includes("預算") || msg.includes("價位") || msg.includes("價格")
  );

  const askedAboutRoast = assistantMessages.some(
    (msg) =>
      msg.includes("烘焙") || msg.includes("淺焙") || msg.includes("深焙")
  );

  return {
    aiQuestionCount,
    showsImpatience,
    isExpert,
    askedAboutAcidity,
    askedAboutPrice,
    askedAboutRoast,
  };
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

  // 分析對話上下文
  const context = analyzeConversationContext(conversationHistory);

  // 檢測用戶當前訊息是否直接要求推薦
  const directlyAsksForRecommendation =
    lowerQuestion.includes("推薦") ||
    lowerQuestion.includes("有什麼") ||
    lowerQuestion.includes("哪些") ||
    lowerQuestion.includes("建議") ||
    lowerQuestion.includes("適合");

  // 如果客戶直接要求推薦且有任何偏好資訊，直接推薦
  if (
    directlyAsksForRecommendation &&
    (prefs.flavorCategory || prefs.price || prefs.roast || prefs.origin)
  ) {
    return ConversationStage.READY_TO_RECOMMEND;
  }

  // 如果 AI 已經問了 3 次以上，且有基本風味偏好，不要再問了
  if (context.aiQuestionCount >= 3 && prefs.flavorCategory) {
    return ConversationStage.READY_TO_RECOMMEND;
  }

  // 如果客戶表現出不耐煩，且有任何偏好，就直接推薦
  if (
    context.showsImpatience &&
    (prefs.flavorCategory || prefs.price || prefs.roast)
  ) {
    return ConversationStage.READY_TO_RECOMMEND;
  }

  // 專家型客戶：如果有風味偏好，少問細節直接推薦
  if (context.isExpert && prefs.flavorCategory) {
    return ConversationStage.READY_TO_RECOMMEND;
  }

  // 如果有特殊排序需求，直接進入推薦階段
  if (prefs.specialSort) {
    return ConversationStage.READY_TO_RECOMMEND;
  }

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
function buildSearchQuery(prefs: UserPreferences): SearchQueryParams {
  const query: SearchQueryParams = { limit: 5 };

  // 處理特殊排序需求
  if (prefs.specialSort) {
    if (prefs.specialSort === "most_expensive") {
      query.sortBy = "price:desc";
      query.limit = 5;
      return query;
    } else if (prefs.specialSort === "cheapest") {
      query.sortBy = "price:asc";
      query.limit = 5;
      return query;
    } else if (prefs.specialSort === "most_popular") {
      query.sortBy = "popularity:desc";
      query.limit = 5;
      return query;
    }
  }

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

    // 分析對話上下文
    const context = analyzeConversationContext(conversationHistory);

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

請用親切的方式詢問顧客喜歡哪種風味類型:
🌸 花香調 (Floral) - 茉莉、玫瑰、柑橘花香
🍒 果酸調 (Fruity) - 莓果、柑橘、水果風味
🥜 堅果調 (Nutty) - 巧克力、堅果、焦糖
💪 濃郁調 (Bold) - 厚實醇厚、深焙煙燻

用1-2句話簡單說明各類型特色,讓顧客選擇。
`;
        break;

      case ConversationStage.FLAVOR_SELECTED:
        // 根據已詢問過的主題，動態調整要問的問題
        const questionsToAsk: string[] = [];

        if (!context.askedAboutAcidity && !prefs.acidity) {
          questionsToAsk.push("酸度偏好：喜歡明亮的高酸？還是柔和的低酸？");
        }

        if (!context.askedAboutPrice && !prefs.price) {
          questionsToAsk.push("預算範圍：大約多少價位？");
        }

        if (!context.askedAboutRoast && !prefs.roast) {
          questionsToAsk.push("烘焙度：偏好淺焙、中焙還是深焙？");
        }

        // 如果沒有問題要問了，直接推薦
        if (questionsToAsk.length === 0) {
          return coffeeAssistantHandler(
            {
              ...req,
              body: {
                ...req.body,
                // 觸發重新判斷階段，這次會進入 READY_TO_RECOMMEND
              },
            } as Request,
            res
          );
        }

        // 只選最多 2 個問題
        const selectedQuestions = questionsToAsk.slice(0, 2);

        stageInstruction = `
【當前階段】已選風味 - 詢問細節偏好

顧客已選擇「${prefs.flavorCategory}」風味,請進一步詢問:
${selectedQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}

${
  context.isExpert
    ? "【注意】此為專家型客戶，可以使用專業術語，不需要過多解釋。"
    : ""
}
${
  context.aiQuestionCount >= 2
    ? "【注意】已問過 2 輪問題，這次問完就準備推薦。"
    : ""
}

不要一次問太多，最多問 2 個問題。
`;
        break;

      case ConversationStage.READY_TO_RECOMMEND:
        // 執行商品查詢
        try {
          const searchQuery = buildSearchQuery(prefs);
          const products = await searchCoffeeForAssistant(searchQuery);

          if (products && products.length > 0) {
            productContext = `\n\n【店內符合商品: ${products.length}款】\n`;
            products.forEach((p: CoffeeProduct, i: number) => {
              const a = p.attributes || p;
              const flavorTags = Array.isArray(a.flavor_tags)
                ? a.flavor_tags.join(", ")
                : a.flavor_tags || "";
              productContext += `${i + 1}. ${a.name} | ${a.origin} | ${
                a.roast
              } | ${flavorTags}\n`;
              productContext += `   酸度${a.acidity} 甜度${a.sweetness} 醇厚${a.body} | $${a.price}\n`;
              const desc = a.description?.substring(0, 60) || "";
              if (desc) productContext += `   ${desc}...\n`;
            });

            // 根據特殊排序需求調整推薦話術
            let recommendInstruction = "";
            if (prefs.specialSort === "most_expensive") {
              recommendInstruction = `
【當前階段】推薦最貴的產品

顧客詢問店內最貴的咖啡,上方已列出價格最高的前5款產品。

推薦話術:⚠️ 必須標註價格
- 直接介紹這些高級精品豆
- 必須標註價格:「售價 $XXX」或「NT$ XXX」
- 強調每款的獨特性與稀有性
- 說明價格反映的品質(如:稀有品種、特殊處理法、得獎豆)
- 用 <strong>產品名稱</strong> 標示
- 簡單列舉即可,不需要全部詳細說明(可以說「還有...等」)

範例:「我們店內最頂級的是 <strong>巴拿馬藝伎</strong>,售價 $1,280,這是世界知名的稀有品種,帶有獨特的花香與柑橘風味 ✨」
`;
            } else if (prefs.specialSort === "cheapest") {
              recommendInstruction = `
【當前階段】推薦最實惠的產品

顧客詢問店內最便宜/平價的咖啡,上方已列出價格最實惠的前5款產品。

推薦話術:⚠️ 必須標註價格
- 必須標註價格:「售價 $XXX」或「只要 NT$ XXX」
- 強調「CP值高」、「經濟實惠」但品質依然很好
- 說明適合日常飲用或新手入門
- 用 <strong>產品名稱</strong> 標示

範例:「推薦您試試 <strong>巴西 日曬</strong>,只要 $380,CP值非常高!帶有巧克力與堅果的香氣,適合日常飲用 ☕」
`;
            } else if (prefs.specialSort === "most_popular") {
              recommendInstruction = `
【當前階段】推薦最受歡迎的產品

顧客詢問店內最熱門的咖啡,上方已列出人氣最高的前5款產品。

推薦話術:⚠️ 必須標註價格
- 必須標註價格:「售價 $XXX」或「NT$ XXX」
- 強調「顧客回購率高」、「長期暢銷」
- 說明為什麼受歡迎(好上手、風味平衡、萬人迷等)
- 用 <strong>產品名稱</strong> 標示

範例:「最受歡迎的是 <strong>衣索比亞 水洗</strong>,售價 $580,這是我們的長期暢銷款,有著柑橘與花香的風味,非常好上手 🌸」
`;
            } else {
              recommendInstruction = `
【當前階段】推薦產品

根據顧客偏好(${JSON.stringify(
                prefs
              )}),從上方「店內商品」中推薦2-3款最適合的產品。

${
  context.isExpert
    ? "【注意】此為專家型客戶，可以提及處理法、批次等專業資訊。"
    : ""
}
${
  context.showsImpatience
    ? "【注意】客戶想快速決定，直接推薦1-2款最佳選擇即可。"
    : ""
}

推薦格式:⚠️ 必須包含價格
- 使用 <strong>產品名稱</strong> 標示
- 說明為什麼適合(連結到顧客提到的偏好)
- 必須標註價格:「售價 $XXX」或「NT$ XXX」
- 提及關鍵風味特點
- 用親切的語氣,像是在咖啡店推薦豆子給朋友

範例:「推薦您試試 <strong>哥倫比亞 厭氧</strong>,售價 $760,這款豆子有著莓果與葡萄酒般的香氣,非常適合喜歡果酸調的您 🍒」
`;
            }

            stageInstruction = `
${recommendInstruction}

⚠️ 只推薦上方列出的店內實際販售商品
⚠️ 絕不提及其他品牌或店外產品

如果顧客還想看更多,可以詢問是否要調整條件。
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
              alternativeProducts
                .slice(0, 3)
                .forEach((p: CoffeeProduct, i: number) => {
                  const a = p.attributes || p;
                  const flavorTags = Array.isArray(a.flavor_tags)
                    ? a.flavor_tags.join(", ")
                    : a.flavor_tags || "";
                  productContext += `${i + 1}. ${a.name} | ${a.origin} | ${
                    a.roast
                  } | ${flavorTags}\n`;
                  productContext += `   酸度${a.acidity} 甜度${a.sweetness} 醇厚${a.body} | $${a.price}\n`;
                  const desc = a.description?.substring(0, 60) || "";
                  if (desc) productContext += `   ${desc}...\n`;
                });
            }

            stageInstruction = `
【當前階段】推薦產品(無完全符合)

店內目前沒有完全符合所有條件的產品。請:
1. 誠實告知:「目前店內沒有完全符合所有條件的款式」
2. 推薦上方列出的「店內相近商品」(說明哪些條件相符,哪些稍有不同)
3. 必須標註價格:「售價 $XXX」或「NT$ XXX」
4. 詢問顧客是否願意調整某個條件(如放寬價格、酸度範圍等)

⚠️ 絕對不要推薦其他品牌或店外產品
⚠️ 只推薦上方列出的店內實際商品
⚠️ 推薦時必須包含價格資訊

範例:「雖然沒有完全符合的,但 <strong>XX豆</strong>(售價 $XXX)很接近您的需求,只是酸度稍微高一點點...」
`;
          }
        } catch (searchErr) {
          console.error("商品查詢錯誤:", searchErr);
          stageInstruction = `查詢商品時發生錯誤,請先回答顧客的問題,不提供具體產品推薦。`;
        }
        break;
    }

    // System Prompt
    const systemPrompt: GeminiMessage = {
      role: "system",
      content: `你是我們咖啡店的專業咖啡顧問,協助顧客挑選合適的咖啡豆。

【重要說明】
✅ 我們的產品資料庫會自動提供符合條件的咖啡豆清單
✅ 你只需要從提供的清單中挑選最適合顧客的產品
✅ 產品資訊會以「【店內符合商品】」或「【店內相近商品】」的形式出現在對話中

【重要限制】
⚠️ 只能推薦清單中列出的產品
⚠️ 絕不推薦其他品牌或清單外的產品
⚠️ 如果清單中沒有完全符合的商品,推薦相近的替代品並引導顧客調整需求

【核心原則】
- 循序漸進:先問風味偏好 → 再問細節 → 最後推薦
- 不要一次問太多問題(最多2個)
- 用親切、自然的語氣,像朋友聊天
- 回答簡潔,5-8句話內
- 避免重複詢問已經問過的問題

【風味分類】
🌸 Floral-花香調 | 🍒 Fruity-果酸調 | 🥜 Nutty-堅果調 | 💪 Bold-濃郁調

【回答格式規範】⚠️ 重要
✅ 必須使用 HTML 格式回覆,範例:
   - 粗體:<strong>產品名稱</strong>
   - 換行:使用 <br> 標籤
   - 列表:不使用 markdown 的 - 或 *,改用自然語氣描述

❌ 禁止使用 Markdown 語法:
   - 不要用 **粗體** 或 __粗體__
   - 不要用 ## 標題
   - 不要用 - 或 * 開頭的列表
   - 不要用 \\n 換行

回覆範例:
「我推薦您試試 <strong>哥倫比亞 厭氧</strong>!這款豆子有著莓果與葡萄酒般的香氣,非常適合喜歡果酸調的您 🍒<br><br>另外也可以考慮 <strong>衣索比亞 日曬</strong>,帶有明亮的柑橘風味 ✨」

${stageInstruction}
`.trim(),
    };

    // User Prompt
    let userContent = "";

    if (conversationHistory.length > 0) {
      userContent += "對話歷史:\n";
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
        context: {
          aiQuestionCount: context.aiQuestionCount,
          showsImpatience: context.showsImpatience,
          isExpert: context.isExpert,
        },
      },
    });
  } catch (err) {
    console.error("咖啡小助手 API 錯誤:", err);
    res.status(500).json({
      error: "抱歉,AI 助手目前遇到問題,請稍後再試",
      answer: "抱歉,我現在有點忙不過來 😅 請稍後再試,或直接聯繫我們的客服!",
    });
  }
}
