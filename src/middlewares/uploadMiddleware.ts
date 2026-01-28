import fileUpload from "express-fileupload";

// 上傳圖片中間件
export const fileUploadMiddleware = fileUpload({
  limits: { fileSize: 5 * 1024 * 1024 }, // 限制 5MB
  abortOnLimit: true,
  responseOnLimit: "檔案大小超過限制 (最大 5MB)",
  useTempFiles: false, // 不使用暫存檔案
  debug: process.env.NODE_ENV === "development",
});
