import { Request, Response } from "express";
import googleAuthService from "../services/googleAuthService";
import { GoogleCallbackQuery } from "../types/auth";

class GoogleAuthController {
  /**
   * 發起 Google 登入
   * GET /api/connect/google
   */
  initiateGoogleLogin(req: Request, res: Response): void {
    try {
      const googleAuthUrl = googleAuthService.getGoogleAuthUrl();
      res.redirect(googleAuthUrl);
    } catch (error) {
      console.error("Error initiating Google login:", error);
      const errorUrl = googleAuthService.buildFrontendErrorUrl("auth_failed");
      res.redirect(errorUrl);
    }
  }

  /**
   * 處理 Google OAuth 回調
   * GET /api/auth/google/callback
   */
  async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { access_token } = req.query as GoogleCallbackQuery;

      // 驗證 access_token 是否存在
      if (!access_token || typeof access_token !== "string") {
        console.error("Missing access_token in callback");
        const errorUrl = googleAuthService.buildFrontendErrorUrl("no_token");
        return res.redirect(errorUrl);
      }

      // 使用 access_token 向 Strapi 進行身份驗證
      const authData = await googleAuthService.authenticateWithGoogle(
        access_token
      );

      // 建構前端回調 URL 並導向
      const callbackUrl = googleAuthService.buildFrontendCallbackUrl(
        authData.jwt,
        authData.user
      );

      res.redirect(callbackUrl);
    } catch (error) {
      // 記錄錯誤詳情
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Google callback error:", errorMessage);

      const errorUrl = googleAuthService.buildFrontendErrorUrl("auth_failed");
      res.redirect(errorUrl);
    }
  }
}

export default new GoogleAuthController();
