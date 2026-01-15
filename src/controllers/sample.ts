import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";

export async function productHandler(req: Request, res: Response) {
  try {
    // 解析分頁參數，給預設值
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 100;

    // 呼叫公版函式取得資料
    const data = await fetchStrapiData("products", "*", page, pageSize);

    //假設你要加篩選條件就會變成:
    // const data = await fetchStrapiData("products", "", 1, 100, {
    //   fields: ["name", "price"],
    //   filters: { origin: { $eq: "Taiwan" } },
    //   sort: ["price:desc"],
    // });

    console.log("後端拿到資料", data);

    // 原樣回傳給前端
    res.json(data);
  } catch (error) {
    console.error("[productHandler error]", error);

    res.status(500).json({
      error: "取得 products 失敗",
    });
  }
}
