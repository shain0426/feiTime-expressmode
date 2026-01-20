import { Request, Response } from "express";
import { authService } from "@/services/authService";
import { handleError } from "@/utils";

export const loginController = async (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;

    // 參數驗證
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        error: { message: "帳號密碼為必填" },
      });
    }

    const data = await authService.loginWithStrapi(identifier, password);
    res.json(data);
  } catch (error) {
    return handleError(error, res, "認證失敗");
  }
};

// import { Request, Response } from "express";
// import { AxiosError } from "axios";
// import { authService } from "@/services/authService";

// /**
//  * Strapi 錯誤回應型別
//  */
// interface StrapiErrorResponse {
//   error?: {
//     message?: string;
//     details?: unknown;
//   };
//   message?: string;
// }

// export const loginController = async (req: Request, res: Response) => {
//   try {
//     const { identifier, password } = req.body;
//     if (!identifier || !password) {
//       return res.status(400).json({ message: "帳號密碼為必填" });
//     }

//     const data = await authService.loginWithStrapi(identifier, password);
//     res.json(data);
//   } catch (error) {
//     const axiosError = error as AxiosError<StrapiErrorResponse>;
//     console.error("Strapi Error Details:", axiosError.response?.data);
//     res.status(401).json({
//       message: "認證失敗",
//       error: axiosError.response?.data,
//     });
//   }
// };
