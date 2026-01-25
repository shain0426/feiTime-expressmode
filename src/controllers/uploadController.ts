import { Request, Response } from "express";
import FormData from "form-data";
import { strapiClient } from "@/services/dataService";

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

    // 類型斷言處理 express-fileupload 的檔案
    const uploadedFiles = req.files as { [fieldname: string]: any };

    // 取得上傳的檔案 (支援多檔案上傳)
    const files = Array.isArray(uploadedFiles.files)
      ? uploadedFiles.files
      : [uploadedFiles.files];

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

    console.log(`📤 上傳 ${files.length} 個檔案到 Strapi`);

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
  } catch (error: any) {
    console.error("[uploadImageHandler error]", error?.response?.data ?? error);

    // 處理不同類型的錯誤
    let errorMessage = "上傳圖片失敗";
    let statusCode = 500;

    if (error.message?.includes("只支援 WebP 格式")) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error.message?.includes("檔案大小超過限制")) {
      errorMessage = error.message;
      statusCode = 400;
    } else if (error?.response?.data) {
      errorMessage = error.response.data.error?.message || errorMessage;
      statusCode = error.response.status || 500;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error?.response?.data || error?.message,
    });
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
  } catch (error: any) {
    console.error("[deleteImageHandler error]", error?.response?.data ?? error);

    let errorMessage = "刪除圖片失敗";
    let statusCode = 500;

    if (error?.response?.status === 404) {
      errorMessage = "找不到指定的圖片";
      statusCode = 404;
    } else if (error?.response?.data) {
      errorMessage = error.response.data.error?.message || errorMessage;
      statusCode = error.response.status || 500;
    }

    return res.status(statusCode).json({
      success: false,
      error: errorMessage,
      details: error?.response?.data || error?.message,
    });
  }
}
