import { Router } from "express";
import { db } from "@workspace/db";
import { papersTable, questionsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";

const router = Router();

router.get("/subjects/:subjectId/papers", async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    const papers = await db.select().from(papersTable)
      .where(eq(papersTable.subjectId, subjectId))
      .orderBy(papersTable.year);

    const papersWithCount = await Promise.all(
      papers.map(async (paper) => {
        const [qCount] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.paperId, paper.id));
        return { ...paper, questionCount: qCount.count };
      })
    );

    res.json(papersWithCount);
  } catch (err) {
    req.log.error({ err }, "Failed to list papers");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/subjects/:subjectId/papers", async (req, res) => {
  try {
    const subjectId = parseInt(req.params.subjectId);
    const { year, title, fileObjectPath } = req.body;
    if (!year || !title) return res.status(400).json({ error: "year and title are required" });
    const [paper] = await db.insert(papersTable).values({
      subjectId,
      year: parseInt(year),
      title,
      fileObjectPath: fileObjectPath || null,
      extractionStatus: "pending",
    }).returning();
    res.status(201).json({ ...paper, questionCount: 0 });
  } catch (err) {
    req.log.error({ err }, "Failed to create paper");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/papers/:paperId", async (req, res) => {
  try {
    const paperId = parseInt(req.params.paperId);
    const [paper] = await db.select().from(papersTable).where(eq(papersTable.id, paperId));
    if (!paper) return res.status(404).json({ error: "Paper not found" });
    const [qCount] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.paperId, paperId));
    res.json({ ...paper, questionCount: qCount.count });
  } catch (err) {
    req.log.error({ err }, "Failed to get paper");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/papers/:paperId", async (req, res) => {
  try {
    const paperId = parseInt(req.params.paperId);
    await db.delete(papersTable).where(eq(papersTable.id, paperId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete paper");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/papers/:paperId/extract", async (req, res) => {
  const paperId = parseInt(req.params.paperId);
  try {
    const [paper] = await db.select().from(papersTable).where(eq(papersTable.id, paperId));
    if (!paper) return res.status(404).json({ error: "Paper not found" });

    await db.update(papersTable).set({ extractionStatus: "processing" }).where(eq(papersTable.id, paperId));

    let fileContent = "";

    if (paper.fileObjectPath) {
      try {
        const { ObjectStorageService } = await import("../lib/objectStorage.js");
        const storageService = new ObjectStorageService();
        const file = await storageService.getObjectEntityFile(paper.fileObjectPath);
        const [fileContents] = await file.download();
        fileContent = fileContents.toString("utf-8").substring(0, 60000);
      } catch (e) {
        req.log.warn({ e }, "Could not read file from storage, using title only");
      }
    }

    const prompt = `You are an expert exam paper analyzer. Extract ALL questions and their model answers from the following exam paper.

Paper: "${paper.title}" (Year: ${paper.year})
${fileContent ? `\nContent:\n${fileContent}` : "\n(No file content available - generate plausible practice questions based on the paper title and year)"}

Return a JSON array. Each element must have:
- "questionText": the full question text (string)
- "answerText": a comprehensive model answer (string)  
- "marks": the mark value as an integer (1, 2, 3, 4, 5, 6, 8, 10, etc.)
- "topic": the topic/chapter this question covers (string or null)

Rules:
- Extract every question including sub-parts (a), (b), (c) etc.
- For sub-parts, create separate question entries
- If marks aren't shown, estimate based on question complexity
- Return ONLY valid JSON array, no markdown, no explanation

Example format:
[{"questionText": "Define Newton's first law of motion.", "answerText": "An object remains at rest or in uniform motion unless acted upon by an external force.", "marks": 2, "topic": "Mechanics"}]`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content ?? "[]";
    let questions: Array<{ questionText: string; answerText: string; marks: number; topic: string | null }> = [];

    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      questions = JSON.parse(cleaned);
    } catch {
      await db.update(papersTable).set({ extractionStatus: "failed" }).where(eq(papersTable.id, paperId));
      return res.json({ paperId, questionsExtracted: 0, status: "failed", message: "Failed to parse AI response" });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      await db.update(papersTable).set({ extractionStatus: "failed" }).where(eq(papersTable.id, paperId));
      return res.json({ paperId, questionsExtracted: 0, status: "failed", message: "No questions extracted" });
    }

    await db.delete(questionsTable).where(eq(questionsTable.paperId, paperId));

    const toInsert = questions.map((q) => ({
      paperId,
      subjectId: paper.subjectId,
      questionText: String(q.questionText || "").trim(),
      answerText: String(q.answerText || "").trim(),
      marks: typeof q.marks === "number" ? Math.max(1, Math.round(q.marks)) : 1,
      topic: q.topic ? String(q.topic).trim() : null,
    })).filter((q) => q.questionText.length > 0);

    await db.insert(questionsTable).values(toInsert);
    await db.update(papersTable).set({ extractionStatus: "done" }).where(eq(papersTable.id, paperId));

    res.json({ paperId, questionsExtracted: toInsert.length, status: "done", message: null });
  } catch (err) {
    req.log.error({ err }, "Failed to extract questions");
    await db.update(papersTable).set({ extractionStatus: "failed" }).where(eq(papersTable.id, paperId)).catch(() => {});
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
