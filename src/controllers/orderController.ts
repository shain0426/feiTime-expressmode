import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";

export async function getCart(req: Request, res: Response) {
  try {
    const cart = await fetchStrapiData("cart-items", "*", 1, 100);
    res.json(cart);
  } catch (error: any) {
    console.error("後端報錯:", error);
    res.status(500).json({
      error: "取得訂單失敗",
      message: error.message,
      detail: error.response?.data,
    });
  }
}

export async function orderCome(req: Request, res: Response) {
  try {
    res.json();
  } catch (error: any) {
    console.error("後端報錯:", error);
    res.status(500).json({
      error: "取得訂單失敗",
      message: error.message,
      detail: error.response?.data,
    });
  }
}
