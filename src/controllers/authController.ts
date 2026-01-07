import { Request, Response } from "express";
import * as authService from "../services/authService";

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
