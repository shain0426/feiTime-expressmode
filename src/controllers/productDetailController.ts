import { Request, Response } from "express";
import {
  fetchStrapiData,
  putStrapiData,
  createStrapiData,
} from "@/services/dataService";

export async function productDetailHandler(req: Request, res: Response) {
  try {
    const data = await fetchStrapiData("products", "*", 1, 100, {
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
    });

    console.log("📦 後端拿到資料筆數:", data?.length);
    console.log("📦 第一筆資料範例:", data?.[0]);

    // 回傳符合前端期望的格式
    res.json({
      data: data || [], // 包在 data 屬性中
    });

    // console.log("後端拿到資料", data);
    // 原樣回傳給前端
    // res.json(data);
  } catch (error) {
    console.error("[productDetailHandler error]", error);

    res.status(500).json({
      error: "取得 products 失敗",
    });
  }
}

export async function singleProductHandler(req: Request, res: Response) {
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
  } catch (error) {
    console.error("[singleProductHandler error]", error);
    res.status(500).json({
      error: "取得商品失敗",
    });
  }
}

// 推薦商品
export async function recommendProductsHandler(req: Request, res: Response) {
  try {
    const { pid } = req.params;

    // 先取得當前商品的 flavor_type
    const currentProduct = await fetchStrapiData("products", "*", 1, 1, {
      fields: ["flavor_type"],
      filters: {
        pid: { $eq: pid },
      },
    });

    if (!currentProduct || currentProduct.length === 0) {
      return res.status(404).json({
        error: "找不到此商品",
      });
    }

    const flavorType = currentProduct[0].flavor_type;

    // 取得相同 flavor_type 的商品(排除當前商品)
    const recommendations = await fetchStrapiData("products", "*", 1, 100, {
      fields: ["name", "pid"],
      filters: {
        flavor_type: { $eq: flavorType },
        pid: { $ne: pid },
      },
    });

    res.json({
      data: recommendations || [],
    });
  } catch (error) {
    console.error("[recommendProductsHandler error]", error);
    res.status(500).json({
      error: "取得推薦商品失敗",
    });
  }
}

// 修改商品
export async function updateProductHandler(req: Request, res: Response) {
  try {
    const { documentId } = req.params;

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
      imgIds, // 編輯時才會傳：保留的 media ids
    } = (req.body ?? {}) as {
      name?: string;
      english_name?: string;
      price?: number;
      origin?: string;
      processing?: string;
      roast?: string;
      stock?: number;
      weight?: number;
      flavor_type?: string;
      flavor_tags?: { name: string }[];
      description?: string;
      imgIds?: number[];
    };

    if (!documentId) {
      return res.status(400).json({ success: false, error: "缺少 documentId" });
    }

    const updateData: any = {
      ...(name !== undefined ? { name } : {}),
      ...(english_name !== undefined ? { english_name } : {}),
      ...(price !== undefined ? { price } : {}),
      ...(origin !== undefined ? { origin } : {}),
      ...(processing !== undefined ? { processing } : {}),
      ...(roast !== undefined ? { roast } : {}),
      ...(stock !== undefined ? { stock } : {}),
      ...(weight !== undefined ? { weight } : {}),
      ...(flavor_type !== undefined ? { flavor_type } : {}),
      ...(flavor_tags !== undefined ? { flavor_tags } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(Array.isArray(imgIds) ? { img: imgIds } : {}), // 這行就是「刪圖」：把關聯改成保留的
    };

    const updated = await putStrapiData("products", documentId, updateData);

    return res.json({
      success: true,
      message: "商品更新成功",
      data: updated,
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
      // img 先用「media id 陣列」來接
      imgIds,
    } = (req.body ?? {}) as {
      name: string;
      english_name: string;
      pid: string;
      price: number;
      origin: string;
      processing: string;
      roast: string;
      stock: number;
      weight: number;
      flavor_type: string;
      flavor_tags: { name: string }[];
      description: string;
      imgIds?: number[];
    };

    if (!pid || !name) {
      return res.status(400).json({ success: false, error: "pid / name 必填" });
    }

    // 檢查 pid 唯一
    const existed = await fetchStrapiData("products", "*", 1, 1, {
      filters: { pid: { $eq: pid } },
    });

    if (existed?.length) {
      return res.status(409).json({
        success: false,
        error: `pid 已存在：${pid}`,
      });
    }

    // 建立資料（img 用 id 關聯）
    const createData = {
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
      ...(Array.isArray(imgIds) ? { img: imgIds } : {}), // Strapi media 關聯吃 id 陣列
    };

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
