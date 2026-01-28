import { Request, Response } from "express";
import {
  fetchStrapiData,
  putStrapiData,
  createStrapiData,
} from "@/services/dataService";
import { handleError } from "@/utils";

// ========== 類型定義 ==========

interface Product {
  documentId?: string;
  name: string;
  english_name: string;
  pid: string;
  price: number;
  origin: string;
  processing: string;
  roast: string;
  stock: number;
  flavor_type: string;
  description: string;
  weight: string;
  img?: number[];
  acidity?: number;
  sweetness?: number;
  body?: number;
  aftertaste?: number;
  clarity?: number;
  popularity?: number;
}

interface UpdateProductBody {
  name?: string;
  english_name?: string;
  price?: number;
  origin?: string;
  processing?: string;
  roast?: string;
  stock?: number;
  weight?: string;
  flavor_type?: string;
  description?: string;
  imgIds?: number[];
}

interface CreateProductBody {
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
  description: string;
  imgIds?: number[];
  acidity: number;
  sweetness: number;
  body: number;
  aftertaste: number;
  clarity: number;
  popularity: number;
}

interface ProductUpdateData extends Record<string, unknown> {
  name?: string;
  english_name?: string;
  price?: number;
  origin?: string;
  processing?: string;
  roast?: string;
  stock?: number;
  weight?: string;
  flavor_type?: string;
  description?: string;
  img?: number[];
}

interface ProductCreateData extends Record<string, unknown> {
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
  description: string;
  acidity: number;
  sweetness: number;
  body: number;
  aftertaste: number;
  clarity: number;
  popularity: number;
  img: number[];
}

// ========== Handler 函數 ==========

export async function ProductListHandler(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 1000;
    const sort = req.query.sort as string | string[];
    const result = await fetchStrapiData("products", "*", page, pageSize, {
      fields: [
        "documentId",
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

    res.json({
      data: result.data || [],
      meta: result.meta, // 包含 pagination 資訊
    });
  } catch (error: unknown) {
    return handleError(error, res, "取得產品列表失敗");
  }
}

export async function oneProductHandler(req: Request, res: Response) {
  try {
    const { pid } = req.params; // 從 URL 參數取得 pid

    const data = await fetchStrapiData("products", "*", 1, 1, {
      fields: [
        "documentId",
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
        success: false,
        error: {
          message: "找不到此商品",
        },
      });
    }

    res.json({
      data: data[0], // 回傳單筆資料
    });
  } catch (error: unknown) {
    return handleError(error, res, "取得單一產品失敗");
  }
}

// 更新商品內容
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
      description,
      imgIds,
    } = (req.body ?? {}) as UpdateProductBody;

    if (!pid) {
      return res.status(400).json({
        success: false,
        error: {
          message: "缺少 pid",
        },
      });
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
        success: false,
        error: {
          message: "找不到此商品",
        },
      });
    }

    const product = products[0] as Product;

    console.log("📋 商品資料:", {
      documentId: product.documentId,
      pid: product.pid,
    });

    if (!product.documentId) {
      console.error("❌ 警告：documentId 不存在，商品資料:", product);
      return res.status(500).json({
        success: false,
        error: {
          message: "商品缺少 documentId",
          details: product,
        },
      });
    }

    // 準備更新資料
    const updateData: ProductUpdateData = {};

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

    // 處理圖片關聯
    if (Array.isArray(imgIds)) {
      updateData.img = imgIds;
    }

    console.log("📝 準備更新的資料:", updateData);

    // 更新商品
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
  } catch (error: unknown) {
    return handleError(error, res, "更新商品失敗");
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
      description,
      imgIds,
      acidity,
      sweetness,
      body,
      aftertaste,
      clarity,
      popularity,
    } = (req.body ?? {}) as CreateProductBody;

    // 驗證必填欄位
    if (!pid || !name) {
      return res.status(400).json({
        success: false,
        error: {
          message: "pid / name 必填",
        },
      });
    }

    // 驗證圖片必填
    if (!imgIds || !Array.isArray(imgIds) || imgIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: "請至少上傳一張商品圖片",
        },
      });
    }

    // 驗證數值欄位
    if (price < 0 || stock < 0) {
      return res.status(400).json({
        success: false,
        error: {
          message: "價格和庫存不能為負數",
        },
      });
    }

    // 驗證描述長度
    if (description.length < 10 || description.length > 300) {
      return res.status(400).json({
        success: false,
        error: {
          message: "商品描述需在 10-300 字之間",
        },
      });
    }

    // 檢查 pid 唯一性
    const existed = await fetchStrapiData("products", "*", 1, 1, {
      fields: ["pid"],
      filters: { pid: { $eq: pid } },
    });

    if (existed?.length) {
      return res.status(409).json({
        success: false,
        error: {
          message: `pid 已存在：${pid}`,
        },
      });
    }

    // 準備建立資料
    const createData: ProductCreateData = {
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
      acidity,
      sweetness,
      body,
      aftertaste,
      clarity,
      popularity,
      img: imgIds,
    };

    console.log("📝 準備建立的資料:", createData);

    // 新增商品
    const created = await createStrapiData("products", { data: createData });

    return res.status(201).json({
      success: true,
      message: "商品建立成功",
      data: created?.data ?? created,
    });
  } catch (error: unknown) {
    return handleError(error, res, "建立商品失敗");
  }
}
