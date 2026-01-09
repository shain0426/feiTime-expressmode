import { Request, Response } from "express";
import { authService } from "@/services/authService";
export const loginController = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
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
