import { Request, Response, NextFunction } from "express";
import axios from "axios";

const STRAPI_URL = process.env.STRAPI_URL;

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const { data: user } = await axios.get(`${STRAPI_URL}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("[requireAdmin] me =", {
      id: user?.id,
      email: user?.email,
      user_role: user?.user_role,
    });

    const isAdmin = user?.user_role === "Admin";

    if (!isAdmin) {
      return res.status(403).json({ message: "Forbidden (not admin)" });
    }

    (req as any).user = user;
    next();
  } catch (err: any) {
    console.log(
      "[requireAdmin] verify token failed:",
      err?.response?.status,
      err?.response?.data,
    );
    return res.status(401).json({ message: "Invalid token" });
  }
}
