import axios from "axios";
import { AuthResponse } from "@/types/auth";

const STRAPI_URL = process.env.STRAPI_URL;

const strapiClient = axios.create({
  baseURL: STRAPI_URL,
});

/**
 * 註冊用戶資料型別
 */
interface RegisterUserData {
  username: string;
  email: string;
  password: string;
}

/**
 * 重設密碼請求資料型別
 */
interface ResetPasswordData {
  code: string;
  password: string;
  passwordConfirmation: string;
}

export const authService = {
  async registerUser(userData: RegisterUserData): Promise<AuthResponse> {
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
    return response.data;
  },

  async requestStrapiForgotPassword(email: string): Promise<void> {
    await strapiClient.post(`${STRAPI_URL}/api/auth/forgot-password`, {
      email: email,
    });
  },

  async requestStrapiResetPassword(body: ResetPasswordData): Promise<void> {
    const response = await strapiClient.post(
      `${STRAPI_URL}/api/auth/reset-password`,
      body
    );
    return response.data;
  },
};
