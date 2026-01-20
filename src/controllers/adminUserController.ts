import { Request, Response, NextFunction } from "express";
import { userService } from "@/services/authService";

export const userController = {
  // 取得所有用戶
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAllUsers();
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
      const user = await userService.getUserById(id);

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
      // 從 auth middleware 取得 token
      const token = req.headers.authorization?.replace("Bearer ", "");

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
      const token = req.headers.authorization?.replace("Bearer ", "");

      if (!token) {
        return res.status(401).json({
          success: false,
          message: "No token provided",
        });
      }

      const { blocked, user_role } = req.body;

      const payload: Record<string, any> = {
        ...(typeof blocked === "boolean" ? { blocked } : {}),
        ...(user_role ? { user_role } : {}),
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
};
