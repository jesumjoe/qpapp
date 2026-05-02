import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { revisionAttemptsTable } from "@workspace/db/schema";
import { questionsTable } from "@workspace/db/schema";
import { eq, sql, and, inArray } from "drizzle-orm";

const router = Router();

router.post("/subjects/:subjectId/attempts", async (req: Request, res: Response) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    const { sessionId, attempts } = req.body;

    if (!sessionId || !Array.isArray(attempts) || attempts.length === 0) {
      res.status(400).json({ error: "sessionId and non-empty attempts array are required" });
      return;
    }

    const rows = attempts.map((a: { questionId: number; correct: boolean }) => ({
      subjectId,
      questionId: a.questionId,
      correct: a.correct,
      sessionId,
    }));

    await db.insert(revisionAttemptsTable).values(rows);

    res.status(201).json({ recorded: rows.length, sessionId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subjects/:subjectId/performance", async (req: Request, res: Response) => {
  try {
    const subjectId = parseInt(req.params.subjectId);

    const allAttempts = await db
      .select({
        id: revisionAttemptsTable.id,
        questionId: revisionAttemptsTable.questionId,
        correct: revisionAttemptsTable.correct,
        sessionId: revisionAttemptsTable.sessionId,
        createdAt: revisionAttemptsTable.createdAt,
        marks: questionsTable.marks,
      })
      .from(revisionAttemptsTable)
      .leftJoin(questionsTable, eq(revisionAttemptsTable.questionId, questionsTable.id))
      .where(eq(revisionAttemptsTable.subjectId, subjectId))
      .orderBy(revisionAttemptsTable.createdAt);

    const totalAttempts = allAttempts.length;
    const totalCorrect = allAttempts.filter((a) => a.correct).length;
    const overallAccuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;

    const sessionMap = new Map<string, { date: Date; correct: number; total: number }>();
    for (const a of allAttempts) {
      const existing = sessionMap.get(a.sessionId);
      if (!existing) {
        sessionMap.set(a.sessionId, {
          date: a.createdAt,
          correct: a.correct ? 1 : 0,
          total: 1,
        });
      } else {
        existing.correct += a.correct ? 1 : 0;
        existing.total += 1;
      }
    }

    const recentSessions = Array.from(sessionMap.entries())
      .map(([sessionId, s]) => ({
        sessionId,
        date: s.date.toISOString(),
        accuracy: s.total > 0 ? s.correct / s.total : 0,
        totalQuestions: s.total,
        correctAnswers: s.correct,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    const accuracyTrend = Array.from(sessionMap.entries())
      .map(([sessionId, s]) => ({
        sessionId,
        date: s.date.toISOString(),
        accuracy: s.total > 0 ? s.correct / s.total : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const marksBuckets = new Map<number, { correct: number; total: number }>();
    for (const a of allAttempts) {
      const marks = a.marks ?? 1;
      const bucket = marksBuckets.get(marks) ?? { correct: 0, total: 0 };
      bucket.correct += a.correct ? 1 : 0;
      bucket.total += 1;
      marksBuckets.set(marks, bucket);
    }

    const accuracyByMarks = Array.from(marksBuckets.entries())
      .map(([marks, b]) => ({
        marks,
        accuracy: b.total > 0 ? b.correct / b.total : 0,
        totalAttempts: b.total,
      }))
      .sort((a, b) => a.marks - b.marks);

    res.json({
      subjectId,
      overallAccuracy,
      totalAttempts,
      totalSessions: sessionMap.size,
      recentSessions,
      accuracyByMarks,
      accuracyTrend,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
