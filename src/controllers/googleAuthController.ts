import { Request, Response } from "express";
import googleAuthService from "../services/googleAuthService";
import { GoogleCallbackQuery } from "../types/auth";

class GoogleAuthController {
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

  async handleGoogleCallback(req: Request, res: Response): Promise<void> {
    try {
      const { access_token } = req.query as GoogleCallbackQuery;

      if (!access_token) {
        return res.redirect(
          googleAuthService.buildFrontendErrorUrl("no_token"),
        );
      }

      const authData =
        await googleAuthService.authenticateWithGoogle(access_token);

      const callbackUrl = googleAuthService.buildFrontendCallbackUrl(
        authData.jwt,
        authData.user,
      );
      res.redirect(callbackUrl);
    } catch (error: unknown) {
      console.error("Google auth callback error:", error);
      res.redirect(googleAuthService.buildFrontendErrorUrl("auth_failed"));
    }
  }
}

export default new GoogleAuthController();
