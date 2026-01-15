import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";
import {
  calculateScores,
  calculateMaxScores,
  calculateNormalizedScores,
} from "@/services/quizService";

export async function calculateQuizHandler(req: Request, res: Response) {
  try {
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        error: "answers 必須是非空陣列",
      });
    }
    const questions = await fetchStrapiData("questions", "options", 1, 100, {
      sort: ["order:asc"],
    });
    const scores = calculateScores(answers, questions);
    const maxScores = calculateMaxScores(questions);
    const normalizedScores = calculateNormalizedScores(scores, maxScores);
    res.json({
      success: true,
      data: {
        scores,
        maxScores,
        normalizedScores,
      },
    });
  } catch (error) {
    console.error("[calculateQuizHandler error]", error);

    const errorMessage =
      error instanceof Error ? error.message : "計算測驗結果失敗";

    res.status(500).json({
      error: "計算測驗結果失敗",
      message: errorMessage,
    });
  }
}
