import { Request, Response } from "express";
import { strapiClient } from "@/services/dataService";
import { handleError } from "@/utils/errorHandler";

export const UpdateInfo = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { phone_number, shipping_address } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "缺少用戶 ID" });
    }

    // 準備更新資料
    const updateData: Record<string, unknown> = {};
    if (phone_number !== undefined) {
      updateData.phone_number = phone_number;
    }
    if (shipping_address !== undefined) {
      updateData.shipping_address = shipping_address;
    }

    console.log(`✏️ 更新用戶 #${userId}:`, updateData);

    // Strapi Users & Permissions API 不需要包 { data: ... }
    const response = await strapiClient.put(`/api/users/${userId}`, updateData);

    console.log("✅ 更新成功:", response.data);
    return res.status(200).json(response.data);
  } catch (error: unknown) {
    return handleError(error, res, "更新用戶資料失敗");
  }
};
