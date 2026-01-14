import { Request, Response } from "express";
import { authService } from "@/services/authService";
import axios from "axios";

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

export const loginController = async (req: Request, res: Response) => {
  try {
    const { identifier, password, captchaToken } = req.body;
    if (!captchaToken) {
      return res.status(400).json({ error: { message: "安全驗證缺失" } });
    }
    const params = new URLSearchParams();
    params.append("secret", RECAPTCHA_SECRET_KEY || "");
    params.append("response", captchaToken);
    const googleVerifyUrl = `https://www.google.com/recaptcha/api/siteverify`;
    const verifyResult = await axios.post(googleVerifyUrl, params);
    const { success, score, action } = verifyResult.data;
    console.log("Google 回傳結果:", verifyResult.data);
    if (!success || score < 0.5 || action !== "login") {
      return res.status(400).json({ error: { message: "安全驗證失敗" } });
    }
    if (!identifier || !password) {
      return res.status(400).json({ message: "帳號密碼為必填" });
    }

    const data = await authService.loginWithStrapi(identifier, password);
    res.json(data);
  } catch (error: any) {
    console.error("Strapi Error Details:", error.response?.data);
    res.status(401).json({ message: "認證失敗", error: error.response?.data });
  }
};
