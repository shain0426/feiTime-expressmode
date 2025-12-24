import axios from "axios";
import { Request, Response } from "express";
const STRAPI_URL = "https://accessible-dogs-da5b6a029a.strapiapp.com";
export async function questionHandler(req: Request, res: Response) {
  try {
    const response = await axios.get(`${STRAPI_URL}/api/questions`, {
      params: {
        populate: "options",
        sort: "order:asc",
      },
    });
    res.json(response.data);
  } catch (error) {
    console.error("[questionHandler error]", error);
    res.status(500).json({
      error: "取得 questions 失敗",
    });
  }
}
