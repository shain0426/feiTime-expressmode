import { Request, Response } from "express";
import { coffeeResultService } from "@/services/coffeeResultService";
import { handleError } from "@/utils";

export const saveCoffeeResultHandler = async (req: Request, res: Response) => {
  try {
    // 1. 取得前端傳來的數據
    const payload = req.body;

    // 2. 呼叫 Service 進行轉發
    const result = await coffeeResultService.saveToStrapi(payload);

    // 3. 回傳 Strapi 的結果給 Vue 前端
    return res.status(200).json(result);
  } catch (error) {
    // 記錄具體的業務錯誤場景
    console.error("[Controller Error] 轉發測驗結果失敗:", error);

    // 統一錯誤處理：取得 Strapi 回傳的狀態碼與錯誤訊息
    return handleError(error, res, "內部伺服器錯誤");
  }
};
