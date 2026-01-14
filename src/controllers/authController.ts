import { Request, Response } from "express";
import { authService } from "../services/authService";
import axios from "axios";

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

export const register = async (req: Request, res: Response) => {
  try {
    const data = await authService.registerUser(req.body);
    return res.status(200).json(data);
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || "註冊失敗";
    return res.status(error.response?.status || 400).json({
      error: { message: errorMessage },
    });
  }
};

export const resendEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    console.log("-> 嘗試向 Strapi 要求重發信件:", email);
    const data = await authService.sendConfirmationEmail(email);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error("! Strapi 回應錯誤代碼:", error.response?.status);
    console.error("! Strapi 回應內容:", error.response?.data);
    return res
      .status(error.response?.status || 400)
      .json(error.response?.data || { error: { message: "重發失敗" } });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    await authService.requestStrapiForgotPassword(email);
    return res
      .status(200)
      .json({ message: "已發送重設密碼郵件，請檢查您的收件匣" });
  } catch (error: any) {
    console.error("Strapi 回應錯誤代碼:", error.response?.status);
    console.error("Strapi 回應內容:", error.response?.data);
    return res
      .status(error.response?.status || 400)
      .json(error.response?.data || { error: { message: "請求失敗" } });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { code, captchaToken } = req.body;
    const password = req.body.password?.trim();
    const passwordConfirmation = req.body.passwordConfirmation?.trim();
    if (!captchaToken) {
      return res.status(400).json({ error: { message: "請完成機器人驗證" } });
    }
    const params = new URLSearchParams();
    params.append("secret", RECAPTCHA_SECRET_KEY || "");
    params.append("response", captchaToken);

    const googleVerifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const verifyResult = await axios.post(googleVerifyUrl, params);

    const { success, score, action } = verifyResult.data;
    if (!success || score < 0.5) {
      console.error("reCAPTCHA Low Score/Error:", verifyResult.data);
      return res.status(400).json({
        error: { message: "安全驗證未通過 (分數過低)，請稍後再試" },
      });
    }
    if (action !== "reset_password") {
      return res.status(400).json({ error: { message: "無效的驗證動作" } });
    }
    if (password !== passwordConfirmation) {
      return res.status(400).json({ error: { message: "兩次密碼輸入不一致" } });
    }
    await authService.requestStrapiResetPassword({
      code,
      password,
      passwordConfirmation,
    });

    return res.status(200).json({
      message: "密碼已重設成功，您現在可以使用新密碼登入",
    });
  } catch (error: any) {
    console.error("Reset Password Error:", error);
    const strapiError =
      error.response?.data?.error?.message || "重設失敗，請檢查連結是否過期";
    return res.status(error.response?.status || 400).json({
      error: { message: strapiError },
    });
  }
};
