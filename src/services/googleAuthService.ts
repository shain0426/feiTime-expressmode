import axios from "axios";
import { strapiClient } from "@/services/dataService";
import { StrapiAuthResponse } from "../types/auth";

class GoogleAuthService {
  /**
   * 取得 Google OAuth 認證 URL
   */
  getGoogleAuthUrl(): string {
    return `${strapiClient.defaults.baseURL}/api/connect/google`;
  }

  /**
   * 使用 Google access token 向 Strapi 進行身份驗證
   */
  async authenticateWithGoogle(
    accessToken: string
  ): Promise<StrapiAuthResponse> {
    try {
      const response = await strapiClient.get<StrapiAuthResponse>(
        "/api/auth/google/callback",
        {
          params: { access_token: accessToken },
        }
      );

      return response.data;
    } catch (error) {
      // 使用 axios 的類型守衛檢查錯誤
      if (axios.isAxiosError(error)) {
        console.error(
          "Strapi Google auth error:",
          error.response?.data || error.message
        );

        // 根據 HTTP 狀態碼拋出對應的錯誤訊息
        const status = error.response?.status;
        if (status === 401) {
          throw new Error("Google 授權驗證失敗");
        } else if (status === 400) {
          throw new Error("無效的 access token");
        } else if (status === 403) {
          throw new Error("此帳號已被停用");
        }
      }

      throw new Error("Google 登入處理失敗");
    }
  }

  /**
   * 建構前端回調 URL（成功）
   */
  buildFrontendCallbackUrl(
    jwt: string,
    user: StrapiAuthResponse["user"]
  ): string {
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    const userEncoded = encodeURIComponent(JSON.stringify(user));
    return `${FRONTEND_URL}/auth/google/callback?jwt=${jwt}&user=${userEncoded}`;
  }

  /**
   * 建構前端錯誤 URL
   */
  buildFrontendErrorUrl(
    errorType: "no_token" | "auth_failed" | "account_disabled"
  ): string {
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    return `${FRONTEND_URL}/login?error=${errorType}`;
  }
}

export default new GoogleAuthService();
