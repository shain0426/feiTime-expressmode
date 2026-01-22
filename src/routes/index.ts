import { Router } from "express";
import { productHandler } from "@/controllers/productController";
import { questionHandler } from "@/controllers/questionController";
import {
  productDetailHandler,
  singleProductHandler,
  recommendProductsHandler,
  updateProductHandler,
  createProductHandler,
} from "@/controllers/productDetailController";
import { coffeeAssistantHandler } from "@/controllers/coffeeAssistantController";
import {
  getRefineAdvice,
  getRefineReport,
} from "@/controllers/refineAiController";
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
import {
  orderListHandler,
  singleOrderHandler,
  updateOrderHandler,
} from "@/controllers/adminOrderController";
import { userController } from "@/controllers/adminUserController";
import { requireAdmin } from "@/middlewares/requireAdmin";
import { saveCoffeeResultHandler } from "@/controllers/coffeeResultController";
import {
  getCarts,
  orderCome,
  orderGet,
  orderUpdate,
  productsGet,
  productsUpdate,
  deleteCarts,
} from "@/controllers/orderController";
import {
  linepayRequest,
  linepayConfirmation,
} from "@/controllers/linepayController";
import {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearUserCart,
} from "@/controllers/cartController";
import { UpdateInfo } from "@/controllers/memberController";

const router = Router();

// 所有API都放在這裡管理

// === Gemini AI 相關 ===
router.post("/gemini/chat", coffeeAssistantHandler); // 咖啡小助手聊天
router.post("/gemini/refine/advice", getRefineAdvice); // Refine Simulator 即時建議
router.post("/gemini/refine/report", getRefineReport); // Refine Simulator 沖煮報告

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
router.get("/admin-orders", requireAdmin, orderListHandler); // 訂單資訊
router.get("/admin-orders/:order_number", requireAdmin, singleOrderHandler); // 單一訂單資訊
router.put("/admin-orders/:order_number", requireAdmin, updateOrderHandler); // 更新單一訂單運送資訊
// TODO:產品寫完記得加 requireAdmin
router.get("/admin-products", productDetailHandler); // 產品資訊
router.get("/admin-products/:pid", singleProductHandler); // 單一產品資訊
router.put("/admin-products/:pid", updateProductHandler); // 更新單一產品資訊
router.post("/admin-products", createProductHandler); // 新增單一產品資訊

router.post("/quiz/calculate", calculateQuizHandler); //Coffee ID 測驗算分
router.post("/coffee-results", saveCoffeeResultHandler);
router.get("/get-cart", getCarts);
router.post("/orders/checkout", orderCome);
router.get("/order/giveme", orderGet);
router.put("/orders/:id", orderUpdate);
router.get("/products/get", productsGet);
router.put("/products/:id", productsUpdate);
router.delete("/cart-items/:id", deleteCarts);
router.post("/linepay/gobuy", linepayRequest); // linepay 付款請求
router.post("/linePay/confirm", linepayConfirmation); // linepay 付款授權

// === 註冊相關 ===
router.post("/auth/local/register", strictAccountLimiter, register);
router.post(
  "/auth/local/send-email-confirmation",
  emailActionLimiter,
  resendEmail,
);

// === 登入相關 ===
router.post("/login", loginLimiter, loginController);
router.post(
  "/auth/forgot-password",
  emailActionLimiter,
  authController.forgotPassword,
);
router.post(
  "/auth/reset-password",
  emailActionLimiter,
  authController.resetPassword,
);

//=== User相關 ===
router.get("/admin-users/me", userController.getCurrentUser); // 當前使用者資訊
router.get("/admin-users", requireAdmin, userController.getAllUsers); // 使用者資訊
router.get("/admin-users/:id", requireAdmin, userController.getUserById); // 單一使用者資訊
router.put("/admin-users/:id", requireAdmin, userController.updateUser); // 更新單一使用者資訊

// === 購物車相關 ===
router.get("/cart", getCart);
router.post("/cart", addToCart);
router.put("/cart/:documentId", updateCartItem);
router.delete("/cart/:documentId", removeCartItem);
router.delete("/cart", clearUserCart);

// === 會員相關 ===
router.put("/users/:userId", UpdateInfo);

export default router;
