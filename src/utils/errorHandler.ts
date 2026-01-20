// src/utils/errorHandler.ts
import axios, { AxiosError } from "axios";
import { Response } from "express";
import { HttpError } from "./errors";

/**
 * Strapi 錯誤回應結構
 */
interface StrapiErrorResponse {
  error: {
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * 統一錯誤回應格式
 */
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    details?: unknown;
  };
}

/**
 * 通用錯誤處理函數
 * 自動識別錯誤類型並返回適當的 HTTP 回應
 *
 * @param error - 捕獲的錯誤
 * @param res - Express Response 物件
 * @param defaultMessage - 預設錯誤訊息
 * @returns Express Response
 */
export const handleError = (
  error: unknown,
  res: Response,
  defaultMessage: string = "操作失敗"
): Response<ErrorResponse> => {
  console.error("[Error Handler]", error);

  // 1. 處理自定義 HttpError
  if (error instanceof HttpError) {
    return res.status(error.statusCode).json({
      success: false,
      error: {
        message: error.message,
      },
    });
  }

  // 2. 處理 Axios/Strapi 錯誤
  if (axios.isAxiosError<StrapiErrorResponse>(error)) {
    const axiosError = error as AxiosError<StrapiErrorResponse>;
    const statusCode = axiosError.response?.status || 500;
    const errorMessage =
      axiosError.response?.data?.error?.message || defaultMessage;
    const errorDetails = axiosError.response?.data?.error?.details;

    return res.status(statusCode).json({
      success: false,
      error: {
        message: errorMessage,
        ...(errorDetails && { details: errorDetails }),
      },
    });
  }

  // 3. 處理一般 Error
  if (error instanceof Error) {
    return res.status(500).json({
      success: false,
      error: {
        message: error.message || defaultMessage,
      },
    });
  }

  // 4. 處理未知錯誤
  return res.status(500).json({
    success: false,
    error: {
      message: defaultMessage,
    },
  });
};

/**
 * 專門處理 Strapi 錯誤（保留向後兼容）
 * @deprecated 建議使用 handleError
 */
export const handleStrapiError = handleError;
