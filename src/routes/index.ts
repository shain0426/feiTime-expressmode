import { Router } from "express";
import { geminiHandler } from "@/controllers/geminiController";
import { productHandler } from "@/controllers/productController";
import { questionHandler } from "@/controllers/questionController";
import { productDetailHandler } from "@/controllers/productDetailController";
import { coffeeAssistantHandler } from "@/controllers/coffeeAssistantController";

const router = Router();

// 所有API都放在這裡管理

// === Gemini AI 相關 ===
router.post("/gemini", geminiHandler); // 沖煮參數建議(測試用)
router.post("/gemini/chat", coffeeAssistantHandler); // 咖啡小助手聊天

// === 其他 API ===
router.get("/questions", questionHandler); //Coffee ID 測驗
router.get("/products", productHandler); // 產品列表
router.get("/products-detail", productDetailHandler); // 產品詳細資訊

export default router;
