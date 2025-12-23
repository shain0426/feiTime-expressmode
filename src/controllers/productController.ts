import axios from "axios";
import { Request, Response } from "express";

export async function productHandler(req: Request, res: Response) {
  try {
    const response = await axios.get(
      "https://accessible-dogs-da5b6a029a.strapiapp.com/api/products",
      {
        params: {
          populate: "*",
          "pagination[pageSize]": 100,
        },
      }
    );

    // 原樣回傳給前端
    res.json(response.data);
  } catch (error) {
    console.error("[productHandler error]", error);

    res.status(500).json({
      error: "取得 products 失敗",
    });
  }
}
