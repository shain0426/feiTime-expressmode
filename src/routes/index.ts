import { Router } from "express";
import { geminiHandler } from "@/controllers/geminiController";

const router = Router();

// 所有API都放在這裡管理
router.post("/gemini", geminiHandler);

// 範例:
// router.get("/product", productHandler);
// router.post("/auth/login", loginHandler);

export default router;
