import { Request, Response } from "express";
import {
  fetchStrapiData,
  putStrapiData,
  createStrapiData,
} from "@/services/dataService";
import { handleError } from "@/utils";

export async function ProductListHandler(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 1000;
    const sort = req.query.sort as string | string[];
    const result = await fetchStrapiData("products", "*", page, pageSize, {
      fields: [
        "documentId", // Add documentId
        "name",
        "english_name",
        "pid",
        "price",
        "origin",
        "processing",
        "roast",
        "stock",
        "flavor_type",
        "description",
        "weight",
      ],
      sort: ["pid:asc"],
      includeMeta: true,
    });

    console.log("📦 後端拿到資料筆數:", result?.length);
    console.log("📦 第一筆資料範例:", result?.[0]);

    // 回傳符合前端期望的格式
    res.json({
      data: result.data || [],
      meta: result.meta, // 包含 pagination 資訊
    });

    // console.log("後端拿到資料", data);
    // 原樣回傳給前端
    // res.json(data);
  } catch (error: unknown) {
    return handleError(error, res, "取得產品失敗");
  }
}

export async function oneProductHandler(req: Request, res: Response) {
  try {
    const { pid } = req.params; // 從 URL 參數取得 pid

    const data = await fetchStrapiData("products", "*", 1, 1, {
      fields: [
        "documentId", // Add documentId
        "name",
        "english_name",
        "pid",
        "price",
        "origin",
        "processing",
        "roast",
        "stock",
        "flavor_type",
        "description",
        "weight",
      ],
      filters: {
        pid: { $eq: pid }, // 根據 pid 篩選
      },
    });

    if (!data || data.length === 0) {
      return res.status(404).json({
        error: "找不到此商品",
      });
    }

    res.json({
      data: data[0], // 回傳單筆資料
    });
  } catch (error: unknown) {
    return handleError(error, res, "取得單一產品失敗");
  }
}

// 推薦商品(處理法->風味類型)
export async function recommendProductsHandler(req: Request, res: Response) {
  try {
    const { pid } = req.params;

    // 先取得當前商品
    const currentProducts = await fetchStrapiData("products", "*", 1, 1, {
      fields: ["processing", "flavor_type"],
      filters: {
        pid: { $eq: pid },
      },
    });

    if (!currentProducts || currentProducts.length === 0) {
      return res.status(404).json({
        error: "找不到此商品",
      });
    }

    const currentProduct = currentProducts?.[0];

    const { processing, flavor_type } = currentProduct;

    // 第一優先：同 processing（最多 15）($ne排除當前商品)
    const sameProcessing = await fetchStrapiData("products", "*", 1, 15, {
      fields: ["name", "pid", "processing", "flavor_type"],
      filters: {
        processing: { $eq: processing },
        pid: { $ne: pid },
      },
    });

    // 如果已經滿 15，直接回傳
    if (sameProcessing.length >= 15) {
      return res.json({
        data: sameProcessing,
      });
    }

    // 第二優先：同 flavor_type ($ne排除當前商品及處理法推薦過的)
    const remain = 15 - sameProcessing.length;

    const sameFlavor = await fetchStrapiData("products", "*", 1, remain, {
      fields: ["name", "pid", "processing", "flavor_type"],
      filters: {
        flavor_type: { $eq: flavor_type },
        pid: { $ne: pid },
        processing: { $ne: processing },
      },
    });

    res.json({
      data: [...sameProcessing, ...sameFlavor],
    });
  } catch (error: unknown) {
    return handleError(error, res, "取得推薦產品失敗");
  }
}

// 修改商品
export async function updateProductHandler(req: Request, res: Response) {
  try {
    const { pid } = req.params;

    const {
      name,
      english_name,
      price,
      origin,
      processing,
      roast,
      stock,
      weight,
      flavor_type,
      flavor_tags,
      description,
      imgIds,
      publishedAt,
    } = (req.body ?? {}) as {
      name?: string;
      english_name?: string;
      price?: number;
      origin?: string;
      processing?: string;
      roast?: string;
      stock?: number;
      weight?: string;
      flavor_type?: string;
      flavor_tags?: { name: string }[];
      description?: string;
      imgIds?: number[];
      publishedAt?: string | null;
    };

    if (!pid) {
      return res.status(400).json({ success: false, error: "缺少 pid" });
    }

    // 用前端傳來的 pid 去資料庫查詢商品（取得 documentId )
    const products = await fetchStrapiData("products", "*", 1, 1, {
      fields: ["documentId", "pid"],
      filters: {
        pid: { $eq: pid },
      },
    });

    if (!products || products.length === 0) {
      return res.status(404).json({
        error: "找不到此商品",
      });
    }

    const product = products[0];

    console.log("📋 商品資料:", {
      documentId: product.documentId,
      pid: product.pid,
    });

    if (!product.documentId) {
      console.error("❌ 警告：documentId 不存在，商品資料:", product);
      return res.status(500).json({
        error: "商品缺少 documentId",
        product: product,
      });
    }

    // 準備更新資料
    const updateData: Record<string, unknown> = {};

    // 只加入有定義的欄位
    if (name !== undefined) updateData.name = name;
    if (english_name !== undefined) updateData.english_name = english_name;
    if (price !== undefined) updateData.price = price;
    if (origin !== undefined) updateData.origin = origin;
    if (processing !== undefined) updateData.processing = processing;
    if (roast !== undefined) updateData.roast = roast;
    if (stock !== undefined) updateData.stock = stock;
    if (weight !== undefined) updateData.weight = weight;
    if (flavor_type !== undefined) updateData.flavor_type = flavor_type;
    if (description !== undefined) updateData.description = description;

    // 處理 flavor_tags（需要轉換成 Strapi 的 relation 格式）
    if (flavor_tags !== undefined && Array.isArray(flavor_tags)) {
      // 前端傳來的是 { name: "Sweet" } 格式
      // 需要先查詢這些 tag 的 ID，然後關聯
      const tagNames = flavor_tags.map((tag) => tag.name);

      // 批次查詢所有 flavor tags
      const allTags = await fetchStrapiData("flavor-tags", "*", 1, 100, {
        fields: ["documentId", "name"],
        filters: {
          name: { $in: tagNames },
        },
      });

      // 將 tag 關聯轉換為 documentId 陣列
      const tagIds = allTags.map((tag: any) => tag.documentId);
      updateData.flavor_tags = tagIds;
    }

    // 處理圖片關聯
    if (Array.isArray(imgIds)) {
      updateData.img = imgIds;
    }

    // 處理 publishedAt（上下架狀態）
    if (publishedAt !== undefined) {
      updateData.publishedAt = publishedAt;
    }

    console.log("📝 準備更新的資料:", updateData);

    // 使用 putStrapiData（接受 documentId 參數）
    const updatedProduct = await putStrapiData(
      "products",
      product.documentId,
      updateData,
    );

    return res.json({
      success: true,
      message: "商品更新成功",
      data: updatedProduct,
    });
  } catch (error: any) {
    console.error(
      "[updateProductHandler error]",
      error?.response?.data ?? error,
    );
    return res.status(500).json({
      success: false,
      error: "更新商品失敗",
      details: error?.message,
    });
  }
}

// 新增商品
export async function createProductHandler(req: Request, res: Response) {
  try {
    const {
      name,
      english_name,
      pid,
      price,
      origin,
      processing,
      roast,
      stock,
      weight,
      flavor_type,
      flavor_tags,
      description,
      imgIds,
      publishedAt,
    } = (req.body ?? {}) as {
      name: string;
      english_name: string;
      pid: string;
      price: number;
      origin: string;
      processing: string;
      roast: string;
      stock: number;
      weight: string;
      flavor_type: string;
      flavor_tags: { name: string }[];
      description: string;
      imgIds?: number[];
      publishedAt?: string | null;
    };

    if (!pid || !name) {
      return res.status(400).json({ success: false, error: "pid / name 必填" });
    }

    // 檢查 pid 唯一
    const existed = await fetchStrapiData("products", "*", 1, 1, {
      fields: ["pid"],
      filters: { pid: { $eq: pid } },
    });

    if (existed?.length) {
      return res.status(409).json({
        success: false,
        error: `pid 已存在：${pid}`,
      });
    }

    // 準備建立資料
    const createData: Record<string, unknown> = {
      name,
      english_name,
      pid,
      price,
      origin,
      processing,
      roast,
      stock,
      weight,
      flavor_type,
      description,
      // 預設為已上架，除非明確設為 null
      publishedAt:
        publishedAt !== null ? publishedAt || new Date().toISOString() : null,
    };

    // 處理 flavor_tags
    if (flavor_tags && Array.isArray(flavor_tags)) {
      const tagNames = flavor_tags.map((tag) => tag.name);

      // 批次查詢所有 flavor tags
      const allTags = await fetchStrapiData("flavor-tags", "*", 1, 100, {
        fields: ["documentId", "name"],
        filters: {
          name: { $in: tagNames },
        },
      });

      // 將 tag 關聯轉換為 documentId 陣列
      const tagIds = allTags.map((tag: any) => tag.documentId);
      createData.flavor_tags = tagIds;
    }

    // 處理圖片關聯
    if (Array.isArray(imgIds) && imgIds.length > 0) {
      createData.img = imgIds;
    }

    console.log("📝 準備建立的資料:", createData);

    // 使用 createStrapiData（需要傳入 { data: {...} } 格式）
    const created = await createStrapiData("products", { data: createData });

    return res.status(201).json({
      success: true,
      message: "商品建立成功",
      data: created?.data ?? created,
    });
  } catch (error: any) {
    console.error(
      "[createProductHandler error]",
      error?.response?.data ?? error,
    );
    return res.status(500).json({
      success: false,
      error: "建立商品失敗",
      details: error?.message,
    });
  }
}
