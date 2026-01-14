import { Request, Response } from "express";
import { authService } from "../services/authService";

export const register = async (req: Request, res: Response) => {
  try {
    // 呼叫 Service 層
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
    console.error("! Strapi 回應錯誤代碼:", error.response?.status);
    console.error("! Strapi 回應內容:", error.response?.data);
    return res
      .status(error.response?.status || 400)
      .json(error.response?.data || { error: { message: "請求失敗" } });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { code, password, passwordConfirmation } = req.body;
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
      code,
      password,
      passwordConfirmation,
    });
  } catch (error: any) {
    const strapiError =
      error.response?.data?.error?.message || "重設失敗，請檢查連結是否過期";
    return res.status(error.response?.status || 400).json({
      error: { message: strapiError },
    });
  }
};
