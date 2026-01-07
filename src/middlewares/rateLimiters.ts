import rateLimit from "express-rate-limit";

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: { message: "註冊次數過多，請稍後再試" } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: { message: "請求驗證信頻率過高，請稍後再試" } },
  standardHeaders: true,
  legacyHeaders: false,
});
