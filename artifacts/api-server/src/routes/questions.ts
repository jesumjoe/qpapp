import { Router } from "express";
import { db } from "@workspace/db";
import { questionsTable } from "@workspace/db";
import { eq, inArray, sql } from "drizzle-orm";

const router = Router();

router.get("/subjects/:subjectId/questions", async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    const questions = await db
      .select()
      .from(questionsTable)
      .where(eq(questionsTable.subjectId, subjectId))
      .orderBy(questionsTable.marks, questionsTable.createdAt);
    res.json(questions);
  } catch (err) {
    req.log.error({ err }, "Failed to list questions");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/revision/questions", async (req, res) => {
  try {
    const subjectId = parseInt(req.query.subjectId as string);
    const count = Math.min(parseInt((req.query.count as string) ?? "10") || 10, 50);
    const marksFilterRaw = req.query.marksFilter as string | undefined;

    if (isNaN(subjectId)) return res.status(400).json({ error: "subjectId is required" });

    let baseQuery = db.select().from(questionsTable).where(eq(questionsTable.subjectId, subjectId));

    let allQuestions = await baseQuery;

    if (marksFilterRaw) {
      const allowedMarks = marksFilterRaw.split(",").map((m) => parseInt(m.trim())).filter((m) => !isNaN(m));
      allQuestions = allQuestions.filter((q) => allowedMarks.includes(q.marks));
    }

    if (allQuestions.length === 0) {
      return res.json([]);
    }

    // Weighted sampling: higher-mark questions appear more frequently
    const totalWeight = allQuestions.reduce((sum, q) => sum + q.marks, 0);
    const selected: typeof allQuestions = [];
    const usedIds = new Set<number>();

    const sampleSize = Math.min(count, allQuestions.length);

    for (let i = 0; i < sampleSize * 10 && selected.length < sampleSize; i++) {
      let rand = Math.random() * totalWeight;
      for (const q of allQuestions) {
        rand -= q.marks;
        if (rand <= 0 && !usedIds.has(q.id)) {
          selected.push(q);
          usedIds.add(q.id);
          break;
        }
      }
    }

    // Fill remaining if needed (fallback)
    if (selected.length < sampleSize) {
      for (const q of allQuestions) {
        if (!usedIds.has(q.id)) {
          selected.push(q);
          usedIds.add(q.id);
        }
        if (selected.length >= sampleSize) break;
      }
    }

    res.json(selected);
  } catch (err) {
    req.log.error({ err }, "Failed to get revision questions");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
