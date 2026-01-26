import { Request, Response, NextFunction } from "express";
import { userService } from "@/services/authService";

function getTokenFromReq(req: Request) {
  return req.headers.authorization?.replace("Bearer ", "");
}

export const userController = {
  // 取得所有用戶
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const token = getTokenFromReq(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided",
        });
      }

      const users = await userService.getAllUsers(token);

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      next(error);
    }
  },

  // 取得單一用戶
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const token = getTokenFromReq(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided",
        });
      }

      const user = await userService.getUserById(id, token);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  // 取得當前登入用戶資訊
  async getCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const token = getTokenFromReq(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided",
        });
      }

      const user = await userService.getCurrentUser(token);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  },

  // 更新用戶資訊
  async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const token = getTokenFromReq(req);

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided",
        });
      }

      const { blocked, user_role, username, phone_number, shipping_address } =
        req.body;

      const payload: Record<string, any> = {
        ...(typeof blocked === "boolean" ? { blocked } : {}),
        ...(user_role ? { user_role } : {}),
        ...(username ? { username } : {}),
        ...(phone_number ? { phone_number } : {}),
        ...(shipping_address ? { shipping_address } : {}),
      };

      const updatedUser = await userService.updateUser(id, payload, token);

      res.status(200).json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },

  // 更新「當前登入用戶」自己的資料
  async updateMe(req: Request, res: Response, next: NextFunction) {
    try {
      const token = getTokenFromReq(req);
      if (!token) {
        return res
          .status(401)
          .json({ success: false, message: "No token provided" });
      }

      // 先拿自己
      const me = await userService.getCurrentUser(token);

      // ✅ 白名單：只允許改這些
      const { username, phone_number, shipping_address } = req.body;

      const payload: Record<string, any> = {
        ...(username !== undefined ? { username } : {}),
        ...(phone_number !== undefined ? { phone_number } : {}),
        ...(shipping_address !== undefined ? { shipping_address } : {}),
      };

      const updatedUser = await userService.updateUser(
        String(me.id),
        payload,
        token,
      );

      return res.status(200).json({
        success: true,
        data: updatedUser,
      });
    } catch (error) {
      next(error);
    }
  },
};
