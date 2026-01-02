interface Scores {
  acidity: number;
  sweetness: number;
  body: number;
  aftertaste: number;
  clarity: number;
}

interface Option {
  option: string;
  key: string;
  label: string;
  acidity: number;
  sweetness: number;
  body: number;
  aftertaste: number;
  clarity: number;
}

interface Question {
  id: number;
  quizKey: string;
  title: string;
  subtitle?: string;
  order: number;
  options: Option[];
}
type Answer = {
  questionOrder: number;
  optionKey: string;
};
/**
 * 計算用戶答題分數
 * @param answers - 用戶選擇的答案陣列
 */
export function calculateScores(
  answers: Answer[],
  questions: Question[]
): Scores {
  const scores: Scores = {
    acidity: 0,
    sweetness: 0,
    body: 0,
    aftertaste: 0,
    clarity: 0,
  };

  answers.forEach(({ questionOrder, optionKey }) => {
    const question = questions.find((q) => q.order === questionOrder);
    if (!question) return;

    const option = question.options.find((opt) => opt.key === optionKey);
    if (!option) return;

    scores.acidity += option.acidity;
    scores.sweetness += option.sweetness;
    scores.body += option.body;
    scores.aftertaste += option.aftertaste;
    scores.clarity += option.clarity;
  });
  return scores;
}

/**
 * 計算所有問題的最大可能分數
 * @param questions - 問題列表
 */
export function calculateMaxScores(questions: Question[]): Scores {
  const result: Scores = {
    acidity: 0,
    sweetness: 0,
    body: 0,
    aftertaste: 0,
    clarity: 0,
  };

  questions.forEach((question) => {
    const max: Scores = {
      acidity: 0,
      sweetness: 0,
      body: 0,
      aftertaste: 0,
      clarity: 0,
    };

    question.options.forEach((option) => {
      max.acidity = Math.max(max.acidity, option.acidity);
      max.sweetness = Math.max(max.sweetness, option.sweetness);
      max.body = Math.max(max.body, option.body);
      max.aftertaste = Math.max(max.aftertaste, option.aftertaste);
      max.clarity = Math.max(max.clarity, option.clarity);
    });

    result.acidity += max.acidity;
    result.sweetness += max.sweetness;
    result.body += max.body;
    result.aftertaste += max.aftertaste;
    result.clarity += max.clarity;
  });

  return result;
}

/**
 * 計算標準化分數（百分比）
 * @param scores - 實際分數
 * @param maxScores - 最大分數
 */
export function calculateNormalizedScores(
  scores: Scores,
  maxScores: Scores
): Scores {
  return {
    acidity: Math.floor((scores.acidity / maxScores.acidity) * 100),
    sweetness: Math.floor((scores.sweetness / maxScores.sweetness) * 100),
    body: Math.floor((scores.body / maxScores.body) * 100),
    aftertaste: Math.floor((scores.aftertaste / maxScores.aftertaste) * 100),
    clarity: Math.floor((scores.clarity / maxScores.clarity) * 100),
  };
}
