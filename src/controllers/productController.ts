import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";

export async function productHandler(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 100;

    const data = await fetchStrapiData("products", "*", page, pageSize);

    console.log("後端拿到資料", data);
    // 原樣回傳給前端
    res.json(data);
  } catch (error: any) {
    console.error("[productHandler error]", error);
    res.status(500).json({
      error: "取得 products 失敗",
    });
  }
}
