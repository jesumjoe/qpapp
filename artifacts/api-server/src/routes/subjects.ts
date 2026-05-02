import { Router } from "express";
import { db } from "@workspace/db";
import { subjectsTable, questionsTable, papersTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";

const router = Router();

router.get("/grades/:gradeId/subjects", async (req, res) => {
  try {
    const gradeId = parseInt(req.params.gradeId);
    const subjects = await db.select().from(subjectsTable).where(eq(subjectsTable.gradeId, gradeId)).orderBy(subjectsTable.name);
    res.json(subjects);
  } catch (err) {
    req.log.error({ err }, "Failed to list subjects");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/grades/:gradeId/subjects", async (req, res) => {
  try {
    const gradeId = parseInt(req.params.gradeId);
    const { name, code } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const [subject] = await db.insert(subjectsTable).values({ gradeId, name, code }).returning();
    res.status(201).json(subject);
  } catch (err) {
    req.log.error({ err }, "Failed to create subject");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subjects/:subjectId", async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, subjectId));
    if (!subject) return res.status(404).json({ error: "Subject not found" });
    res.json(subject);
  } catch (err) {
    req.log.error({ err }, "Failed to get subject");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/subjects/:subjectId", async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    await db.delete(subjectsTable).where(eq(subjectsTable.id, subjectId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete subject");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subjects/:subjectId/stats", async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);

    const [totalQuestionsRow] = await db
      .select({ count: count() })
      .from(questionsTable)
      .where(eq(questionsTable.subjectId, subjectId));

    const [totalPapersRow] = await db
      .select({ count: count() })
      .from(papersTable)
      .where(eq(papersTable.subjectId, subjectId));

    const questionsByMarks = await db
      .select({ marks: questionsTable.marks, count: count() })
      .from(questionsTable)
      .where(eq(questionsTable.subjectId, subjectId))
      .groupBy(questionsTable.marks)
      .orderBy(questionsTable.marks);

    const recentPapers = await db
      .select()
      .from(papersTable)
      .where(eq(papersTable.subjectId, subjectId))
      .orderBy(sql`${papersTable.year} DESC`)
      .limit(5);

    const papersWithCount = await Promise.all(
      recentPapers.map(async (paper) => {
        const [qCount] = await db
          .select({ count: count() })
          .from(questionsTable)
          .where(eq(questionsTable.paperId, paper.id));
        return { ...paper, questionCount: qCount.count };
      })
    );

    res.json({
      subjectId,
      totalQuestions: totalQuestionsRow.count,
      totalPapers: totalPapersRow.count,
      questionsByMarks,
      recentPapers: papersWithCount,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get subject stats");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
