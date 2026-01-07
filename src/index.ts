import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes/index";
import axios from "axios";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

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

//註冊route
app.post("/api/auth/local/register", async (req, res) => {
  const { username, email, password } = req.body;
  const STRAPI_URL = process.env.STRAPI_URL;
  try {
    const strapiResponse = await axios.post(
      `${STRAPI_URL}/api/auth/local/register`,
      {
        username: username,
        email: email,
        password: password,
      }
    );

    res.status(200).json(strapiResponse.data);
  } catch (error: any) {
    const errorMessage = error.response?.data?.error?.message || "註冊失敗";
    res.status(error.response?.status || 400).json({
      error: { message: errorMessage },
    });
  }
});

//啟動 server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
