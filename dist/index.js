"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import "module-alias/register";
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
//讀取 .env 環境變數，例如 GEMINI_API_KEY
// IMPORTANT: dotenv 必須在其他 import 之前執行，確保 process.env 有值
// 修正：將 routes 移到 dotenv.config() 之後
dotenv_1.default.config();
// 現在 import routes，內部的 dataService 就會讀到正確的 process.env.STRAPI_URL
const index_1 = __importDefault(require("./routes/index"));
const googleAuth_1 = __importDefault(require("./routes/googleAuth"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
//允許前端跨域請求 (支援本地開發和正式環境)
const allowedOrigins = [
    "http://localhost:5173",
    process.env.FRONTEND_URL,
].filter(Boolean);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // 允許沒有 origin 的請求（如 Postman 或伺服器間請求）
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
}));
//解析 JSON request body
app.use(express_1.default.json());
//測試 server 是否啟動
app.get("/health", (_req, res) => res.json({ status: "ok" }));
//掛載集中管理的 route
app.use("/api", index_1.default);
// google 註冊的route
app.use("/api", googleAuth_1.default);
//分享功能的route
app.get("/share", (req, res) => {
    const { name, img } = req.query;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    if (!name || !img || img === "undefined") {
        return res.redirect(frontendUrl);
    }
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="zh-TW">
    <head>
      <meta charset="UTF-8">
      <title>Coffee ID - ${name}</title>
      
      <meta property="og:title" content="我的咖啡風格是：${name}，快來FeiTime Coffee一起測一測！">
      <meta property="og:image" content="${img}">
      <meta property="og:type" content="website">

      <script>
        window.location.href = "${frontendUrl}/#/coffee-result?persona=${encodeURIComponent(name)}";
      </script>
    </head>
    <body>
      <div style="display:flex; justify-content:center; align-items:center; height:100vh;">
        <p>正在載入 ${name} 的 Coffee ID...</p>
      </div>
    </body>
    </html>
  `;
    res.send(htmlContent);
});
//啟動 server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    // DEBUG: Prevent process from exiting if event loop is empty (防呆用)
    setInterval(() => { }, 60000);
});
