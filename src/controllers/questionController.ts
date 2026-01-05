import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";

export async function questionHandler(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const pageSize = Number(req.query.pageSize) || 100;
    const data = await fetchStrapiData("questions", "options", page, pageSize, {
      sort: ["order:asc"],
    });

    console.log("後端拿到資料", data);
    res.json(data);
  } catch (error: any) {
    console.error("[questionHandler error]", error);
    res.status(500).json({
      error: "取得 questions 失敗",
    });
  }
}
