import { Request, Response } from "express";
import { coffeeResultService } from "@/services/coffeeResultService";

export const saveCoffeeResultHandler = async (req: Request, res: Response) => {
  try {
    // 1. 取得前端傳來的數據
    const payload = req.body;

    // 2. 呼叫 Service 進行轉發
    const result = await coffeeResultService.saveToStrapi(payload);

    // 3. 回傳 Strapi 的結果給 Vue 前端
    return res.status(200).json(result);
  } catch (error: any) {
    console.error(
      "[Controller Error] 轉發測驗結果失敗:",
      error.response?.data || error.message
    );

    // 取得 Strapi 回傳的狀態碼，若無則預設 500
    const statusCode = error.response?.status || 500;
    const errorMessage =
      error.response?.data?.error?.message || "內部伺服器錯誤";

    return res.status(statusCode).json({
      success: false,
      message: errorMessage,
    });
  }
};
