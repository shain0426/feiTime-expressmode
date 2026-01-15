import { Router } from "express";
import { geminiHandler } from "@/controllers/geminiController";
import { productHandler } from "@/controllers/productController";
import { questionHandler } from "@/controllers/questionController";
import {
  productDetailHandler,
  singleProductHandler,
  recommendProductsHandler,
} from "@/controllers/productDetailController";
import { coffeeAssistantHandler } from "@/controllers/coffeeAssistantController";
import { featuredProductHandler } from "@/controllers/featuredProductController";
import {
  flavorMusicHandler,
  randomMusicHandler,
  musicHealthCheck,
} from "@/controllers/flavorMusicController";
import { calculateQuizHandler } from "@/controllers/quizController";
import { register, resendEmail } from "@/controllers/authController";
import {
  strictAccountLimiter,
  emailActionLimiter,
  loginLimiter,
} from "@/middlewares/rateLimiters";
import { loginController } from "../controllers/loginController";
import * as authController from "@/controllers/authController";
import { getCart } from "@/controllers/orderController";

const router = Router();

// 所有API都放在這裡管理

// === Gemini AI 相關 ===
router.post("/gemini", geminiHandler); // 沖煮參數建議(測試用)
router.post("/gemini/chat", coffeeAssistantHandler); // 咖啡小助手聊天

// === 首頁-風味音樂推薦系統 ===
router.post("/music/flavor", flavorMusicHandler); // 根據風味推薦音樂
router.post("/music/random", randomMusicHandler); // 取得隨機音樂推薦
router.get("/music/health", musicHealthCheck); // 音樂系統健康檢查

// === 其他 API ===
router.get("/questions", questionHandler); // Coffee ID 測驗題目
router.get("/products", productHandler); // 產品列表
router.get("/product-detail", productDetailHandler); // 產品詳細資訊
router.get("/product-detail/:pid", singleProductHandler); // 單一產品詳細資訊
router.get("/product-detail/:pid/recommendations", recommendProductsHandler); // 依風味：推薦商品
router.get("/featured/products", featuredProductHandler); // 首頁：精選產品
router.post("/quiz/calculate", calculateQuizHandler); //Coffee ID 測驗算分
router.get("/get-cart", getCart); // 取得訂單部分

// === 註冊相關 ===
router.post("/auth/local/register", strictAccountLimiter, register);
router.post(
  "/auth/local/send-email-confirmation",
  emailActionLimiter,
  resendEmail
);

// === 登入相關 ===
router.post("/login", loginLimiter, loginController);
router.post(
  "/auth/forgot-password",
  emailActionLimiter,
  authController.forgotPassword
);
router.post(
  "/auth/reset-password",
  emailActionLimiter,
  authController.resetPassword
);
export default router;
