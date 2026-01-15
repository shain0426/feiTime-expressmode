import axios from "axios";
import { AuthResponse, RegisterInput, ResetPasswordInput } from "@/types/auth";

const STRAPI_URL = process.env.STRAPI_URL;

const strapiClient = axios.create({
  baseURL: STRAPI_URL,
});

export const authService = {
  async registerUser(userData: RegisterInput): Promise<AuthResponse> {
    const response = await strapiClient.post(
      `${STRAPI_URL}/api/auth/local/register`,
      userData
    );
    return response.data;
  },

  async sendConfirmationEmail(email: string) {
    const response = await strapiClient.post(
      `${process.env.STRAPI_URL}/api/auth/send-email-confirmation`,
      { email }
    );
    return response.data;
  },

  async loginWithStrapi(
    identifier: string,
    password: string
  ): Promise<AuthResponse> {
    const response = await strapiClient.post(`${STRAPI_URL}/api/auth/local`, {
      identifier,
      password,
    });

    // Strapi v5 Login 回傳的 user 物件可能不包含 documentId
    // 因此我們需要額外呼叫 /api/users/me 來取得完整資訊
    if (response.data.jwt) {
      try {
        const meRes = await strapiClient.get(`${STRAPI_URL}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${response.data.jwt}`
          }
        });
        // 合併 user 資料
        response.data.user = { ...response.data.user, ...meRes.data };
      } catch (error) {
        console.error("Failed to fetch user details:", error);
      }
    }

    return response.data;
  },

  async requestStrapiForgotPassword(email: string): Promise<void> {
    await strapiClient.post(`${STRAPI_URL}/api/auth/forgot-password`, {
      email: email,
    });
  },

  async requestStrapiResetPassword(body: ResetPasswordInput): Promise<void> {
    const response = await strapiClient.post(
      `${STRAPI_URL}/api/auth/reset-password`,
      body
    );
    return response.data;
  },
};
