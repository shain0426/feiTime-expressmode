import type { Request, Response } from "express";
import { geminiText } from "@/services/geminiClient";

export async function geminiHandler(req: Request, res: Response) {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "prompt is required" });
    }

    const text = await geminiText(prompt);
    res.json({ text });
  } catch (err) {
    console.error("Gemini API error:", err);
    res.status(500).json({ error: "Gemini failed" });
  }
}
