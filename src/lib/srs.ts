import { Question, db } from "./db";

/**
 * SuperMemo-2 (SM-2) algorithm for Spaced Repetition
 * quality: 0 (Again), 3 (Hard), 4 (Good), 5 (Easy)
 */
export function calculateNextReview(
  question: Question,
  quality: number
): Partial<Question> {
  let { interval = 0, easeFactor = 2.5, consecutiveCorrect = 0 } = question;

  if (quality >= 3) {
    // Correct answer
    if (consecutiveCorrect === 0) {
      interval = 1;
    } else if (consecutiveCorrect === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * easeFactor);
    }
    consecutiveCorrect++;
  } else {
    // Incorrect answer
    consecutiveCorrect = 0;
    interval = 1;
  }

  // Update ease factor: EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (easeFactor < 1.3) easeFactor = 1.3;

  const nextReviewDate = Date.now() + interval * 24 * 60 * 60 * 1000;

  return {
    interval,
    easeFactor,
    consecutiveCorrect,
    nextReviewDate
  };
}

export async function updateQuestionSrs(questionId: number, quality: number) {
  const question = await db.questions.get(questionId);
  if (!question) return;

  const updates = calculateNextReview(question, quality);
  await db.questions.update(questionId, updates);
}
