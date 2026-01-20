"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const index_1 = __importDefault(require("./routes/index"));
const googleAuth_1 = __importDefault(require("./routes/googleAuth"));
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; //允許自簽憑證，但正式上線要拿掉！！！
//讀取 .env 環境變數，例如 GEMINI_API_KEY
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
//允許前端跨域請求
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
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
//啟動 server
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
