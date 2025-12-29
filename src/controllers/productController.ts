import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";
const STRAPI_URL = process.env.STRAPI_URL;
export async function productHandler(req: Request, res: Response) {
  try {
    const roast = req.query.roast;
    // req 是前端要傳給後端的資料
    // query 是網址後面的參數
    // req.query.roast 就等於告訴後端 從網址中找到?roast=xxxxxx  也就是xxxxx
    const origin = req.query.origin;
    const processing = req.query.processing;
    const flavor_type = req.query.flavor_type;

    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 100;

    // 格式必須是：{ filters: { 欄位名(篩選什麼): { 運算子(怎麼篩選): 值 } } }
    const options = {
      filters: {
        ...(roast && { roast: { $eq: roast } }),
        // 如果沒有roast 變成 undefined && { roast: { $eq: undefined } }
        // 整條會變成 undefined  strapi會忽略這條 變成搜尋全部
        // 如果有roast 變成    淺焙 && { roast: { $eq: 淺焙 } }
        // 依照JS 當A、B都是true   A && B 會是B
        // 整條會變成 { roast: { $eq: 淺焙 } }
        ...(origin && { origin: { $eq: origin } }),
        ...(processing && { processing: { $eq: processing } }),
        ...(flavor_type && { flavor_type: { $eq: flavor_type } }),
      },
    };

    const data = await fetchStrapiData(
      "products",
      "*",
      page,
      pageSize,
      options
    );

    res.json(data);
  } catch (error: any) {
    console.error("[productHandler error]", error);
    res.status(500).json({
      error: "取得 products 失敗",
    });
  }
}
