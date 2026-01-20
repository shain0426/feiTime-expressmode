import { Request, Response } from "express";
import { authService } from "../services/authService";
import { handleError } from "@/utils";

export const register = async (req: Request, res: Response) => {
  try {
    const data = await authService.registerUser(req.body);
    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res, "註冊失敗");
  }
};

export const resendEmail = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    console.log("-> 嘗試向 Strapi 要求重發信件:", email);
    const data = await authService.sendConfirmationEmail(email);
    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res, "重發郵件失敗");
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    await authService.requestStrapiForgotPassword(email);
    return res.status(200).json({
      message: "已發送重設密碼郵件,請檢查您的收件匣",
    });
  } catch (error) {
    return handleError(error, res, "發送重設密碼郵件失敗");
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { code, password, passwordConfirmation } = req.body;

    if (password !== passwordConfirmation) {
      return res.status(400).json({
        success: false,
        error: { message: "兩次密碼輸入不一致" },
      });
    }

    await authService.requestStrapiResetPassword({
      code,
      password,
      passwordConfirmation,
    });

    return res.status(200).json({
      message: "密碼已重設成功，您現在可以使用新密碼登入",
    });
  } catch (error) {
    return handleError(error, res, "重設密碼失敗，請檢查連結是否過期");
  }
};
