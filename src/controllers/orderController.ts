import { Request, Response } from "express";
import {
  fetchStrapiData,
  strapiPost,
  strapiPut,
  productsPut,
  cartsDelete,
} from "@/services/dataService";
import { handleError } from "@/utils/errorHandler";

export async function getCarts(req: Request, res: Response) {
  try {
    const cart = await fetchStrapiData("cart-items", "*", 1, 100);
    res.json(cart);
  } catch (error: unknown) {
    return handleError(error, res, "取得購物車失敗");
  }
}

export async function orderCome(req: Request, res: Response) {
  try {
    const formData = req.body as Record<string, unknown>;
    const result = await strapiPost("orders", formData);
    res.json({
      status: "success",
      data: result,
    });
  } catch (error: unknown) {
    return handleError(error, res, "POST訂單失敗");
  }
}

export async function orderGet(req: Request, res: Response) {
  try {
    const order = await fetchStrapiData("orders", "*", 1, 100);
    res.json(order);
  } catch (error: unknown) {
    return handleError(error, res, "取得訂單失敗");
  }
}

export const orderUpdate = async (req: Request, res: Response) => {
  try {
    const id = req.params.id.toString();
    const updateBody = req.body as Record<string, unknown>;

    const result = await strapiPut("orders", updateBody, id);
    console.log(result.data);
    res.status(200).json(result);
  } catch (error: unknown) {
    return handleError(error, res, "更新訂單失敗");
  }
};

export async function productsGet(req: Request, res: Response) {
  try {
    const product = await fetchStrapiData("products", "*", 1, 100);
    res.json(product);
  } catch (error: unknown) {
    return handleError(error, res, "取得產品失敗");
  }
}

export const productsUpdate = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const updateBody = req.body as Record<string, unknown>;

    console.log("檢查產品put的參數");
    console.log(id);
    console.log(updateBody);

    const result = await productsPut("products", updateBody, id);
    console.log(result.data);
    res.status(200).json(result.data);
  } catch (error: unknown) {
    return handleError(error, res, "更新產品失敗");
  }
};

export const deleteCarts = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;

    console.log("檢查delete的參數");
    console.log(id);
    const result = await cartsDelete("cart-items", id);
    console.log(result.data);
    res.status(200).json(result.data);
  } catch (error: unknown) {
    return handleError(error, res, "刪除購物車項目失敗");
  }
};
