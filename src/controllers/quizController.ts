import { Request, Response } from "express";
import { fetchStrapiData } from "@/services/dataService";
import {
  calculateScores,
  calculateMaxScores,
  calculateNormalizedScores,
} from "@/services/quizService";

/**
 * 計算測驗結果
 * POST /api/quiz/calculate
 * Body: { answers: Option[] }
 */
export async function calculateQuizHandler(req: Request, res: Response) {
  try {
    const { answers } = req.body;

    if (!Array.isArray(answers) || answers.length === 0) {
      return res.status(400).json({
        error: "answers 必須是非空陣列",
      });
    }

    // 1. 獲取所有問題（用於計算最大分數）
    const questions = await fetchStrapiData("questions", "options", 1, 100, {
      sort: ["order:asc"],
    });

    // 2. 計算實際分數
    const scores = calculateScores(answers, questions);

    // 3. 計算最大分數
    const maxScores = calculateMaxScores(questions);

    // 4. 計算標準化分數
    const normalizedScores = calculateNormalizedScores(scores, maxScores);

    res.json({
      success: true,
      data: {
        scores,
        maxScores,
        normalizedScores,
      },
    });
  } catch (error: any) {
    console.error("[calculateQuizHandler error]", error);
    res.status(500).json({
      error: "計算測驗結果失敗",
      message: error.message,
    });
  }
}
