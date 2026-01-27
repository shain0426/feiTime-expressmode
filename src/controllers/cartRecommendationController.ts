import type { Request, Response } from "express";
import { geminiText } from "@/services/geminiClient";
import { fetchStrapiData } from "@/services/dataService";
import type { GeminiMessage } from "@/types/gemini";

/**
 * 使用者風味偏好資料結構 (來自 Coffee ID 測驗)
 */
interface UserFlavorProfile {
    persona_name: string;
    acidity: number;    // 0-100
    sweetness: number;  // 0-100
    body: number;       // 0-100
    aftertaste: number; // 0-100
    clarity: number;    // 0-100
}

/**
 * 商品風味資料結構
 */
interface ProductFlavorProfile {
    id: number;
    documentId?: string;
    name: string;
    flavor_type: "Fruity" | "Floral" | "Nutty" | "Bold";
    roast: "Light" | "Medium" | "Dark";
    origin?: string;
    processing?: string;
    flavor_tags?: string[];
    price: number;
    stock?: number;
    img?: any[];
}

/**
 * AI 推薦回應結構
 */
interface AIRecommendationResponse {
    aiMessage: {
        matchPercentage: number;
        message: string;
        brewingTip: string;
    };
    recommendations: Array<ProductFlavorProfile & { matchScore: number }>;
}

/**
 * flavor_type 對應的風味分數
 */
const FLAVOR_TYPE_PROFILES: Record<string, UserFlavorProfile> = {
    Fruity: { persona_name: "", acidity: 80, sweetness: 60, body: 30, aftertaste: 50, clarity: 70 },
    Floral: { persona_name: "", acidity: 70, sweetness: 50, body: 25, aftertaste: 60, clarity: 80 },
    Nutty: { persona_name: "", acidity: 40, sweetness: 65, body: 70, aftertaste: 55, clarity: 50 },
    Bold: { persona_name: "", acidity: 30, sweetness: 40, body: 90, aftertaste: 80, clarity: 35 },
};

/**
 * 從 Strapi 取得使用者的 Coffee ID 測驗結果
 */
async function fetchUserCoffeeResult(userId: number): Promise<UserFlavorProfile | null> {
    try {
        const results = await fetchStrapiData(
            "coffee-results",
            "*",
            1,
            1,
            {
                filters: { user: { id: { $eq: userId } } },
                sort: ["createdAt:desc"],
            }
        );

        if (!results || results.length === 0) {
            console.log(`📭 使用者 ${userId} 沒有 Coffee ID 測驗結果`);
            return null;
        }

        const result = results[0];
        return {
            persona_name: result.persona_name || "",
            acidity: result.acidity || 50,
            sweetness: result.sweetness || 50,
            body: result.body || 50,
            aftertaste: result.aftertaste || 50,
            clarity: result.clarity || 50,
        };
    } catch (err) {
        console.error("❌ 取得使用者 Coffee ID 結果失敗:", err);
        return null;
    }
}

/**
 * 計算使用者偏好與商品的契合度分數
 */
function calculateMatchScore(
    userProfile: UserFlavorProfile,
    product: ProductFlavorProfile
): number {
    const productProfile = FLAVOR_TYPE_PROFILES[product.flavor_type];
    if (!productProfile) return 50; // 預設中等契合度

    // 計算加權歐幾里得距離
    const distance = Math.sqrt(
        Math.pow(userProfile.acidity - productProfile.acidity, 2) +
        Math.pow(userProfile.sweetness - productProfile.sweetness, 2) +
        Math.pow(userProfile.body - productProfile.body, 2) +
        Math.pow(userProfile.aftertaste - productProfile.aftertaste, 2) +
        Math.pow(userProfile.clarity - productProfile.clarity, 2)
    );

    // 最大可能距離 ≈ 223 (sqrt(5 * 100^2))
    // 轉換為 0-100 分數
    return Math.max(0, Math.round(100 - (distance / 223) * 100));
}

/**
 * 從 Strapi 取得所有商品並計算推薦分數
 */
async function getPersonalizedRecommendations(
    userProfile: UserFlavorProfile,
    excludeIds: number[],
    limit: number = 3
): Promise<Array<ProductFlavorProfile & { matchScore: number }>> {
    try {
        const products = await fetchStrapiData("products", "*", 1, 50);

        if (!products || products.length === 0) {
            return [];
        }

        // 計算每個商品的契合度並排序
        const scoredProducts = products
            .filter((p: any) => !excludeIds.includes(p.id))
            .map((p: any) => ({
                id: p.id,
                documentId: p.documentId,
                name: p.name,
                flavor_type: p.flavor_type,
                roast: p.roast,
                origin: p.origin,
                processing: p.processing,
                flavor_tags: p.flavor_tags,
                price: p.price,
                stock: p.stock,
                img: p.img,
                matchScore: calculateMatchScore(userProfile, p),
            }))
            .sort((a: any, b: any) => b.matchScore - a.matchScore)
            .slice(0, limit);

        return scoredProducts;
    } catch (err) {
        console.error("❌ 取得推薦商品失敗:", err);
        return [];
    }
}

/**
 * 使用 Gemini 生成個人化訊息
 */
async function generateAIMessage(
    userProfile: UserFlavorProfile,
    cartItemName: string,
    matchScore: number
): Promise<{ message: string; brewingTip: string }> {
    try {
        const systemPrompt: GeminiMessage = {
            role: "system",
            content: `你是 FeiTime Coffee 的咖啡精靈，專門為顧客提供個人化咖啡推薦。
根據用戶的風味偏好和購物車商品，提供：
1. 簡短的契合度評語（15字內，要有溫度和驚喜感）
2. 一個實用的沖煮小撇步（40字內，具體且專業）

回覆必須是純 JSON 格式，不要有其他文字：
{"評語": "...", "沖煮建議": "..."}`,
        };

        const userPrompt: GeminiMessage = {
            role: "user",
            content: `用戶風味人格：${userProfile.persona_name}
風味偏好：酸度${userProfile.acidity}、甜度${userProfile.sweetness}、醇厚${userProfile.body}
購物車商品：${cartItemName}
契合度：${matchScore}%`,
        };

        const response = await geminiText([systemPrompt, userPrompt]);

        // 解析 JSON 回應
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                message: parsed["評語"] || "這款咖啡很適合您！",
                brewingTip: parsed["沖煮建議"] || "試試用 93°C 熱水沖煮，風味更佳。",
            };
        }

        return {
            message: "這款咖啡很適合您！",
            brewingTip: "試試用 93°C 熱水沖煮，風味更佳。",
        };
    } catch (err) {
        console.error("❌ Gemini 生成訊息失敗:", err);
        return {
            message: "這款咖啡很適合您！",
            brewingTip: "試試用 93°C 熱水沖煮，風味更佳。",
        };
    }
}

/**
 * 購物車 AI 推薦 API Handler
 * POST /api/cart/recommendations
 */
export async function cartRecommendationHandler(
    req: Request,
    res: Response
): Promise<void> {
    try {
        const { userId, cartItems } = req.body;

        // 驗證參數
        if (!userId) {
            res.status(400).json({
                success: false,
                error: { message: "userId is required" },
            });
            return;
        }

        console.log(`🔮 處理購物車推薦請求 - userId: ${userId}`);

        // 1. 取得使用者 Coffee ID 結果
        const userProfile = await fetchUserCoffeeResult(userId);

        if (!userProfile) {
            // 使用者沒有測驗結果，回傳提示
            res.json({
                success: true,
                hasProfile: false,
                message: "完成 Coffee ID 測驗以獲得個人化推薦",
                aiMessage: null,
                recommendations: [],
            });
            return;
        }

        // 2. 計算購物車商品的平均契合度
        const cartItemIds = (cartItems || []).map((item: any) => item.id);
        let avgMatchScore = 85; // 預設值
        let featuredItemName = "您選的咖啡";

        if (cartItems && cartItems.length > 0) {
            const scores = cartItems.map((item: any) =>
                calculateMatchScore(userProfile, item)
            );
            avgMatchScore = Math.round(
                scores.reduce((a: number, b: number) => a + b, 0) / scores.length
            );
            featuredItemName = cartItems[0].name || "您選的咖啡";
        }

        // 3. 使用 Gemini 生成個人化訊息
        const aiGenerated = await generateAIMessage(
            userProfile,
            featuredItemName,
            avgMatchScore
        );

        // 4. 取得推薦商品
        const recommendations = await getPersonalizedRecommendations(
            userProfile,
            cartItemIds,
            3
        );

        // 5. 回傳結果
        const response: AIRecommendationResponse = {
            aiMessage: {
                matchPercentage: avgMatchScore,
                message: aiGenerated.message,
                brewingTip: aiGenerated.brewingTip,
            },
            recommendations,
        };

        console.log(`✅ 推薦完成 - 契合度: ${avgMatchScore}%, 推薦 ${recommendations.length} 件商品`);

        res.json({
            success: true,
            hasProfile: true,
            ...response,
        });
    } catch (err) {
        console.error("❌ 購物車推薦 API 錯誤:", err);
        res.status(500).json({
            success: false,
            error: { message: "推薦系統暫時無法使用" },
        });
    }
}
