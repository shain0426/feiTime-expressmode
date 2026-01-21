import express, { Router } from "express";
import googleAuthController from "@/controllers/googleAuthController";

const router: Router = express.Router();

router.get("/connect/google", (req, res) => {
  console.log("Google OAuth initiated");
  googleAuthController.initiateGoogleLogin(req, res);
});

router.get("/auth/google/callback", async (req, res) => {
  console.log("Google callback received");
  await googleAuthController.handleGoogleCallback(req, res);
});

export default router;
