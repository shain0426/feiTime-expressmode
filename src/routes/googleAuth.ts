import express, { Router } from "express";
import googleAuthController from "@/controllers/googleAuthController";

const router: Router = express.Router();

router.get("/connect/google", (req, res) => {
  googleAuthController.initiateGoogleLogin(req, res);
});

router.get("/auth/google/callback", async (req, res) => {
  await googleAuthController.handleGoogleCallback(req, res);
});

export default router;
