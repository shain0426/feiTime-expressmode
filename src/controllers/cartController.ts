import { Request, Response } from "express";
import {
    fetchStrapiData,
    postStrapiData,
    putStrapiData,
    deleteStrapiData,
} from "@/services/dataService";

/**
 * GET /api/cart
 * 取得某使用者的購物車內容
 * Query: ?userId=123
 */
export const getCart = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: "Missing userId" });
        }

        // 篩選該 User 的 Cart Items
        const filters = {
            user: { id: { $eq: userId } },
        };

        const data = await fetchStrapiData("cart-items", "*", 1, 100, { filters });
        res.json(data);
    } catch (error: any) {
        console.error("[getCart error]", error);
        res.status(500).json({ error: "Failed to fetch cart" });
    }
};

/**
 * POST /api/cart
 * 新增購物車項目
 * Body: { user: id, product: id, quantity: 1, ... }
 */
export const addToCart = async (req: Request, res: Response) => {
    try {
        const payload = req.body; // 前端傳來的完整資料
        console.log("📥 Backend received cart payload:", JSON.stringify(payload, null, 2));

        if (!payload.user || !payload.product) {
            return res.status(400).json({ error: "Missing user or product" });
        }

        console.log("🔍 Field Types - User:", typeof payload.user, "Product:", typeof payload.product);

        // 強制轉換為 Connect Syntax 
        // 嘗試改用 'set' 語法測試
        // ✅ Strapi Schema 已更新為 Long Text，恢復 snapshot_image 寫入
        const strapiPayload = {
            ...payload,
            user: { set: [payload.user] },
            product: { set: [payload.product] }
        };

        console.log("📤 Sending to Strapi (Set Syntax):", JSON.stringify(strapiPayload, null, 2));

        // 呼叫 Strapi 新增
        const data = await postStrapiData("cart-items", strapiPayload);
        res.json(data);
    } catch (error: any) {
        console.error("[addToCart error]", error);

        // Debug: Print the exact error response from Strapi
        if (error.response) {
            console.error("🔴 Strapi Response Status:", error.response.status);
            console.error("🔴 Strapi Response Data:", JSON.stringify(error.response.data, null, 2));
        }

        // 回傳詳細錯誤資訊以便除錯
        res.status(500).json({
            error: "Failed to add to cart",
            details: error.response?.data || error.message
        });
    }
};

/**
 * PUT /api/cart/:documentId
 * 更新購物車項目 (數量等)
 * Body: { quantity: 2, item_total: 100, ... }
 */
export const updateCartItem = async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;
        const payload = req.body;

        if (!documentId) {
            return res.status(400).json({ error: "Missing documentId" });
        }

        const data = await putStrapiData("cart-items", documentId, payload);
        res.json(data);
    } catch (error: any) {
        console.error("[updateCartItem error]", error);
        res.status(500).json({ error: "Failed to update cart item" });
    }
};

/**
 * DELETE /api/cart/:documentId
 * 刪除購物車項目
 */
export const removeCartItem = async (req: Request, res: Response) => {
    try {
        const { documentId } = req.params;
        if (!documentId) {
            return res.status(400).json({ error: "Missing documentId" });
        }

        await deleteStrapiData("cart-items", documentId);
        res.json({ success: true });
    } catch (error: any) {
        console.error("[removeCartItem error]", error);
        res.status(500).json({ error: "Failed to remove cart item" });
    }
};

/**
 * DELETE /api/cart
 * 清空某使用者的購物車
 * Query: ?userId=123
 */
export const clearUserCart = async (req: Request, res: Response) => {
    try {
        const userId = req.query.userId;
        if (!userId) {
            return res.status(400).json({ error: "Missing userId" });
        }

        // 1. 先查出該 User 所有 Cart Items
        const filters = {
            user: { id: { $eq: userId } },
        };
        const cartItems = await fetchStrapiData("cart-items", "*", 1, 100, { filters });

        if (!cartItems || cartItems.length === 0) {
            return res.json({ success: true, message: "Cart is already empty" });
        }

        console.log(`🧹 Clearing cart for user ${userId}. Found ${cartItems.length} items.`);

        // 2. 逐筆刪除 (因為 Strapi 預設 API 不支援 Batch Delete by Filter)
        const deletePromises = cartItems.map((item: any) => {
            if (item.documentId) {
                return deleteStrapiData("cart-items", item.documentId);
            }
            return Promise.resolve();
        });

        await Promise.all(deletePromises);

        res.json({ success: true, deletedCount: cartItems.length });
    } catch (error: any) {
        console.error("[clearUserCart error]", error);
        res.status(500).json({ error: "Failed to clear cart" });
    }
};
