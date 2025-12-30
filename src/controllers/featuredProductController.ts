import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";

// /**
//  * 隨機選擇 4 個產品顯示為精選產品（首頁熱門商品）
//  * GET /api/featured/products
//  *
export async function featuredProductHandler(req: Request, res: Response) {
  try {
    const limit = 4;

    const allProducts = await fetchStrapiData("products", "img", 1, 100);

    console.log("📦 取得產品總數:", allProducts.length);
    if (allProducts.length > 0) {
      console.log(
        "📦 第一個產品範例:",
        JSON.stringify(allProducts[0], null, 2)
      );
    }

    // 隨機選擇 4 個產品（Fisher-Yates 部分洗牌）
    const selected = [];
    const pool = [...allProducts];

    for (let i = 0; i < Math.min(limit, pool.length); i++) {
      const randomIndex = i + Math.floor(Math.random() * (pool.length - i));
      [pool[i], pool[randomIndex]] = [pool[randomIndex], pool[i]];
      selected.push(pool[i]);
    }

    // 自動添加標籤
    const withLabels = selected.map((product: any, index: number) => ({
      ...product,
      isPopular: index === 0,
      isNew: index === 3,
    }));

    console.log(`✅ 取得 ${withLabels.length} 個精選產品`);

    res.json(withLabels);
  } catch (error: any) {
    console.error("[featuredProductHandler error]", error);
    res.status(500).json({
      error: "取得精選產品失敗",
    });
  }
}
