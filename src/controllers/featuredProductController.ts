import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";

// /**
//  * 隨機選擇 4 個產品顯示為精選產品（首頁熱門商品）
//  * GET /api/featured/products
//  *
//  * 邏輯：
//  * 1. 從 Strapi 取得所有產品
//  * 2. 隨機選擇 4 個產品
//  * 3. 自動為第 1 個產品加上 isPopular 標籤
//  * 4. 自動為第 4 個產品加上 isNew 標籤
//  */
// export async function featuredProductHandler(req: Request, res: Response) {
//   try {
//     const limit = 4;

//     // 取得所有產品
//     const allProducts = await fetchStrapiData("products", "*", 1, 100);

//     // 隨機選擇 4 個產品
//     const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
//     const selected = shuffled.slice(0, limit);

//     // 自動添加標籤
//     const withLabels = selected.map((product: any, index: number) => ({
//       ...product,
//       isPopular: index === 0, // 第一個標記為 Popular
//       isNew: index === 3, // 第四個標記為 New
//     }));

//     console.log(`✅ 取得 ${withLabels.length} 個精選產品`);

//     res.json(withLabels);
//   } catch (error: any) {
//     console.error("[featuredProductHandler error]", error);
//     res.status(500).json({
//       error: "取得精選產品失敗",
//     });
//   }
// }

export async function featuredProductHandler(req: Request, res: Response) {
  try {
    const limit = 4;

    // 取得所有產品（包含 img 關聯資料）
    const allProducts = await fetchStrapiData("products", "img", 1, 100);

    console.log("📦 取得產品總數:", allProducts.length);
    if (allProducts.length > 0) {
      console.log(
        "📦 第一個產品範例:",
        JSON.stringify(allProducts[0], null, 2)
      );
    }

    // 隨機選擇 4 個產品
    const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, limit);

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
