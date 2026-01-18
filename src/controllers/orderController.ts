import { Request, Response } from "express";
import { fetchStrapiData, strapiPost, strapiPut } from "@/services/dataService";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const strapiClient = axios.create({
  baseURL: process.env.STRAPI_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}`,
  },
});

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
    const formData = req.body; // 取得前端傳來的資料
    const result = await strapiPost("orders", formData);
    res.json({
      status: "success",
      data: result,
    });
  } catch (error: any) {
    console.error("後端報錯:", error);
    res.status(500).json({
      error: "POST訂單失敗",
      message: error.message,
      detail: error.response?.data,
    });
  }
}

export async function orderGet(req: Request, res: Response) {
  try {
    const order = await fetchStrapiData("orders", "*", 1, 100);
    res.json(order);
  } catch (error: any) {
    console.error("後端報錯:", error);
    res.status(500).json({
      error: "取得訂單失敗",
      message: error.message,
      detail: error.response?.data,
    });
  }
}

export async function orderUpdate(req: Request, res: Response) {
  try {
    const orderId = req.body.order_number;
    const findRes = await strapiClient.get(
      `/api/orders?filters[order_number][$eq]=${orderId}`,
    );
    const actualOrder = findRes.data.data[0];

    if (!actualOrder) {
      return res.status(404).json({ message: "找不到此訂單編號" });
    }

    const realId = actualOrder.id;

    const update = await strapiPut(`/api/orders/${realId}`, {
      data: {
        payment_status: "paid",
        order_status: "processing",
        paid_at: new Date().toISOString(),
      },
    });
    res.json(update.data);
  } catch (error: any) {
    console.error("後端報錯:", error);
    res.status(500).json({
      error: "取得訂單失敗",
      message: error.message,
      detail: error.response?.data,
    });
  }
}
