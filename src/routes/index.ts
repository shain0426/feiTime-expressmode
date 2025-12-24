import { Router } from "express";
import { geminiHandler } from "@/controllers/geminiController";
import { productHandler } from "@/controllers/productController";
import { questionHandler } from "@/controllers/questionController";

const router = Router();

// 所有API都放在這裡管理
router.post("/gemini", geminiHandler);
router.get("/questions", questionHandler);
router.get("/products", productHandler);

// 範例:
// router.get("/product", productHandler);
// router.post("/auth/login", loginHandler);

export default router;
