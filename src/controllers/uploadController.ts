import { Request, Response } from "express";
import FormData from "form-data";
import { strapiClient } from "@/services/dataService";
import { handleError } from "@/utils/errorHandler";

/**
 * 處理圖片上傳到 Strapi
 * 這個 handler 會接收前端上傳的圖片，然後轉發給 Strapi 的 upload API
 */
export async function uploadImageHandler(req: Request, res: Response) {
  try {
    // 檢查是否有上傳檔案
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        error: "沒有上傳任何檔案",
      });
    }

    // 取得上傳的檔案 (支援多檔案上傳)
    const files = Array.isArray(req.files.files)
      ? req.files.files
      : [req.files.files];

    // 建立 FormData 準備轉發給 Strapi
    const formData = new FormData();

    files.forEach((file: any) => {
      // 驗證檔案類型 - 只允許 WebP
      if (file.mimetype !== "image/webp") {
        throw new Error(`只支援 WebP 格式，收到的格式: ${file.mimetype}`);
      }

      // 驗證檔案大小 (限制 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error(`檔案大小超過限制 (最大 5MB): ${file.name}`);
      }

      // 將檔案加入 FormData
      formData.append("files", file.data, {
        filename: file.name,
        contentType: file.mimetype,
      });
    });

    console.log(`上傳 ${files.length} 個檔案到 Strapi`);

    // 使用 strapiClient 轉發給 Strapi 的 upload API
    const strapiResponse = await strapiClient.post("/api/upload", formData, {
      headers: {
        ...formData.getHeaders(),
        // Authorization header 已經在 strapiClient 中設定
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });

    console.log("✅ 上傳成功:", strapiResponse.data?.length, "個檔案");

    // 回傳上傳成功的檔案資訊
    return res.json(strapiResponse.data);
  } catch (error: unknown) {
    return handleError(error, res, "建立圖片失敗");
  }
}

/**
 * 刪除 Strapi 中的圖片
 * 注意：這個功能會真的從 Strapi 刪除檔案
 * 如果只是要從商品移除圖片關聯，應該在 updateProductHandler 中處理
 */
export async function deleteImageHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: "缺少圖片 ID",
      });
    }

    console.log(`🗑️ 刪除圖片 ID: ${id}`);

    // 使用 strapiClient 呼叫 Strapi 的刪除 API
    await strapiClient.delete(`/api/upload/files/${id}`);

    console.log("✅ 刪除成功");

    return res.json({
      success: true,
      message: "圖片刪除成功",
    });
  } catch (error: unknown) {
    return handleError(error, res, "刪除圖片失敗");
  }
}
