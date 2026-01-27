import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";
import { handleError } from "@/utils/errorHandler";

/**
 * 取得會員的所有訂單
 * GET /api/member/:userId/orders
 */
export const getMemberOrders = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "缺少用戶 ID" });
    }

    const orders = await fetchStrapiData("orders", "*", 1, 100, {
      filters: {
        user: {
          user_id: {
            // 指向 user 物件裡的 user_id 欄位
            $eq: userId,
          },
        },
      },
    });

    return res.status(200).json({ data: orders });
  } catch (error: unknown) {
    return handleError(error, res, "取得會員訂單失敗");
  }
};
