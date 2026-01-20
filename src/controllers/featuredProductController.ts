import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";
import { handleError } from "@/utils";

/**
 * Strapi 產品型別（可能有 attributes 包裝或直接是屬性）
 */
interface StrapiProduct {
  id?: number;
  attributes?: Record<string, unknown>;
  [key: string]: unknown; // 其他動態屬性
}

/**
 * 帶標籤的產品型別
 */
interface ProductWithLabels extends StrapiProduct {
  isPopular: boolean;
  isNew: boolean;
}

/**
 * 隨機選擇 4 個產品顯示為精選產品（首頁熱門商品）
 * GET /api/featured/products
 */
export async function featuredProductHandler(req: Request, res: Response) {
  try {
    const limit = 4;

    const allProducts: StrapiProduct[] = await fetchStrapiData(
      "products",
      "img",
      1,
      100
    );

    console.log("📦 取得產品總數:", allProducts.length);
    if (allProducts.length > 0) {
      console.log(
        "📦 第一個產品範例:",
        JSON.stringify(allProducts[0], null, 2)
      );
    }

    // 隨機選擇 4 個產品（Fisher-Yates 部分洗牌）
    const selected: StrapiProduct[] = [];
    const pool = [...allProducts];

    for (let i = 0; i < Math.min(limit, pool.length); i++) {
      const randomIndex = i + Math.floor(Math.random() * (pool.length - i));
      [pool[i], pool[randomIndex]] = [pool[randomIndex], pool[i]];
      selected.push(pool[i]);
    }

    // 自動添加標籤
    const withLabels: ProductWithLabels[] = selected.map((product, index) => ({
      ...product,
      isPopular: index === 0,
      isNew: index === 3,
    }));

    console.log(`✅ 取得 ${withLabels.length} 個精選產品`);

    res.json(withLabels);
  } catch (error) {
    return handleError(error, res, "取得精選產品失敗");
  }
}
