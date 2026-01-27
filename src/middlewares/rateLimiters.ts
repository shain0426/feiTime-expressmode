import rateLimit from "express-rate-limit";

export const strictAccountLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: { message: "操作次數過多，請一小時後再試" } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: { message: "操作次數過多，請一小時後再試" } },
  standardHeaders: true,
  legacyHeaders: false,
});

export const emailActionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: { message: "郵件請求頻率過高，請檢查信箱或稍後再試" } },
  standardHeaders: true,
  legacyHeaders: false,
});
