import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index";
import axios from "axios";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; //允許自簽憑證，但正式上線要拿掉！！！

//讀取 .env 環境變數，例如 GEMINI_API_KEY
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

//允許前端跨域請求
app.use(cors());

//解析 JSON request body
app.use(express.json());

//測試 server 是否啟動
app.get("/health", (_req, res) => res.json({ status: "ok" }));

//掛載集中管理的 route
app.use("/api", routes);

//啟動 server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
