import express, { Router } from "express";
import googleAuthController from "@/controllers/googleAuthController";

const router: Router = express.Router();

// 發起 Google 登入
router.get("/connect/google", (req, res) => {
  console.log("Google OAuth initiated");
  googleAuthController.initiateGoogleLogin(req, res);
});

// 處理 Google 回調
router.get("/auth/google/callback", async (req, res) => {
  console.log("Google callback received");
  await googleAuthController.handleGoogleCallback(req, res);
});

export default router;
