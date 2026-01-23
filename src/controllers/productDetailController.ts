import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";

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
  } catch (error) {
    console.error("[recommendProductsHandler error]", error);
    res.status(500).json({
      error: "取得推薦商品失敗",
    });
  }
}
