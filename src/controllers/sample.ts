/**
 * 📦 Strapi 公版函式使用範例
 *
 * 完整示範 CRUD 操作：查詢(GET)、新增(POST)、更新(PUT)、刪除(DELETE)
 */

import { Request, Response } from "express";
import {
  fetchStrapiData,
  createStrapiData,
  updateStrapiData,
  deleteStrapiData,
} from "@/services/dataService";

// ========================================
// 📖 查詢資料 (GET)
// ========================================

/**
 * 取得產品列表
 * GET /api/products?page=1&pageSize=20
 */
export async function getProductsHandler(req: Request, res: Response) {
  try {
    // 解析分頁參數
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 100;

    // 📌 用法 1：基本查詢 - 取得所有資料，populate 所有關聯
    const data = await fetchStrapiData("products", "*", page, pageSize);

    // 📌 用法 2：進階查詢 - 指定欄位、篩選、排序
    // const data = await fetchStrapiData("products", "*", page, pageSize, {
    //   fields: ["name", "price", "origin"],       // 只回傳這些欄位
    //   filters: {
    //     origin: { $eq: "Taiwan" },               // 產地等於台灣
    //     price: { $gte: 300, $lte: 1000 }         // 價格介於 300-1000
    //   },
    //   sort: ["price:desc", "name:asc"]           // 先按價格降冪，再按名稱升冪
    // });

    // 📌 用法 3：只 populate 特定關聯欄位
    // const data = await fetchStrapiData("products", "category,images", page, pageSize);

    // 📌 用法 4：不 populate 任何關聯（最快）
    // const data = await fetchStrapiData("products", undefined, page, pageSize);

    console.log("✅ 後端取得資料:", data);
    res.json(data);
  } catch (error) {
    console.error("❌ [getProductsHandler error]", error);
    res.status(500).json({
      error: "取得產品列表失敗",
      message: error instanceof Error ? error.message : "未知錯誤",
    });
  }
}

// ========================================
// ➕ 新增資料 (POST)
// ========================================

/**
 * 新增產品
 * POST /api/products
 * Body: { "name": "咖啡豆", "price": 500, "origin": "Taiwan" }
 */
export async function createProductHandler(req: Request, res: Response) {
  try {
    const { name, price, origin, stock, description } = req.body;

    // 基本驗證
    if (!name || !price) {
      return res.status(400).json({ error: "name 和 price 為必填欄位" });
    }

    // 📌 新增資料
    const newProduct = await createStrapiData("products", {
      data: {
        name,
        price,
        origin,
        stock: stock || 0,
        description,
        // category: 1,  // 如果要關聯到其他 collection，傳入 ID
      },
    });

    console.log("✅ 新增成功:", newProduct);
    res.status(201).json(newProduct);
  } catch (error) {
    console.error("❌ [createProductHandler error]", error);
    res.status(500).json({
      error: "新增產品失敗",
      message: error instanceof Error ? error.message : "未知錯誤",
    });
  }
}

// ========================================
// ✏️ 更新資料 (PUT)
// ========================================

/**
 * 更新產品
 * PUT /api/products/:id
 * Body: { "price": 600, "stock": 10 }
 */
export async function updateProductHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // 檢查是否有要更新的資料
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: "沒有提供要更新的資料" });
    }

    // 📌 更新資料
    const updated = await updateStrapiData("products", id, {
      data: updateData,
    });

    console.log("✅ 更新成功:", updated);
    res.json(updated);
  } catch (error) {
    console.error("❌ [updateProductHandler error]", error);
    res.status(500).json({
      error: "更新產品失敗",
      message: error instanceof Error ? error.message : "未知錯誤",
    });
  }
}

// ========================================
// 🗑️ 刪除資料 (DELETE)
// ========================================

/**
 * 刪除產品
 * DELETE /api/products/:id
 */
export async function deleteProductHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // 📌 刪除資料
    const deleted = await deleteStrapiData("products", id);

    console.log("✅ 刪除成功:", deleted);
    res.json({
      message: "刪除成功",
      data: deleted,
    });
  } catch (error) {
    console.error("❌ [deleteProductHandler error]", error);
    res.status(500).json({
      error: "刪除產品失敗",
      message: error instanceof Error ? error.message : "未知錯誤",
    });
  }
}

/**
 * 🔍 常見篩選運算子參考：
 *
 * $eq       等於                { price: { $eq: 500 } }
 * $ne       不等於              { origin: { $ne: "Taiwan" } }
 * $lt       小於                { price: { $lt: 1000 } }
 * $lte      小於等於            { price: { $lte: 1000 } }
 * $gt       大於                { stock: { $gt: 0 } }
 * $gte      大於等於            { price: { $gte: 300 } }
 * $in       在陣列中            { origin: { $in: ["Taiwan", "Japan"] } }
 * $notIn    不在陣列中          { status: { $notIn: ["deleted"] } }
 * $contains     包含（區分大小寫）      { name: { $contains: "Coffee" } }
 * $containsi    包含（不分大小寫）      { name: { $containsi: "coffee" } }
 * $null     是否為 null         { deletedAt: { $null: true } }
 * $notNull  是否不為 null       { publishedAt: { $notNull: true } }
 * $between  介於範圍            { price: { $between: [100, 500] } }
 * $startsWith 開頭是            { name: { $startsWith: "Arabica" } }
 * $endsWith   結尾是            { name: { $endsWith: "Blend" } }
 */
