import axios, { AxiosError } from "axios";
import { StrapiAuthResponse } from "../types/auth";

const STRAPI_URL = process.env.STRAPI_URL || "http://localhost:1337";

class GoogleAuthService {
  getGoogleAuthUrl(): string {
    return `${STRAPI_URL}/api/connect/google`;
  }

  async authenticateWithGoogle(
    accessToken: string
  ): Promise<StrapiAuthResponse> {
    try {
      const response = await axios.get<StrapiAuthResponse>(
        `${STRAPI_URL}/api/auth/google/callback`,
        {
          params: { access_token: accessToken },
        }
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        console.error(
          "Strapi Google auth error:",
          axiosError.response?.data || axiosError.message
        );

        if (axiosError.response?.status === 401) {
          throw new Error("Google 授權驗證失敗");
        } else if (axiosError.response?.status === 400) {
          throw new Error("無效的 access token");
        } else if (axiosError.response?.status === 403) {
          throw new Error("此帳號已被停用");
        }
      }

      throw new Error("Google 登入處理失敗");
    }
  }

  buildFrontendCallbackUrl(jwt: string, user: any): string {
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    const userEncoded = encodeURIComponent(JSON.stringify(user));
    return `${FRONTEND_URL}/auth/google/callback?jwt=${jwt}&user=${userEncoded}`;
  }

  buildFrontendErrorUrl(
    errorType: "no_token" | "auth_failed" | "account_disabled"
  ): string {
    const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
    return `${FRONTEND_URL}/login?error=${errorType}`;
  }
}

export default new GoogleAuthService();
