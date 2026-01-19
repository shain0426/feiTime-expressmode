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

export const orderUpdate = async (req: Request, res: Response) => {
  try {
    const id = req.params.id.toString();
    const updateBody = req.body;

    console.log("看資料");
    console.log(id);
    console.log(updateBody);

    const result = await strapiPut("orders", updateBody, id);
    console.log(result.data);
    res.status(200).json(result);
  } catch (err: any) {
    console.error("PUT錯誤", err.message);
    res.status(500).json({ error: err.message });
  }
};

export async function productsGet(req: Request, res: Response) {
  try {
    const product = await fetchStrapiData("products", "*", 1, 100);
    res.json(product);
  } catch (error: any) {
    console.error("後端報錯:", error);
    res.status(500).json({
      error: "取得訂單失敗",
      message: error.message,
      detail: error.response?.data,
    });
  }
}
