import { Router } from "express";
import { db } from "@workspace/db";
import { gradesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/grades", async (req, res) => {
  try {
    const grades = await db.select().from(gradesTable).orderBy(gradesTable.name);
    res.json(grades);
  } catch (err) {
    req.log.error({ err }, "Failed to list grades");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/grades", async (req, res) => {
  try {
    const { name, level } = req.body;
    if (!name || !level) {
      return res.status(400).json({ error: "name and level are required" });
    }
    const [grade] = await db.insert(gradesTable).values({ name, level }).returning();
    res.status(201).json(grade);
  } catch (err) {
    req.log.error({ err }, "Failed to create grade");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/grades/:gradeId", async (req, res) => {
  try {
    const gradeId = parseInt(req.params.gradeId);
    const [grade] = await db.select().from(gradesTable).where(eq(gradesTable.id, gradeId));
    if (!grade) return res.status(404).json({ error: "Grade not found" });
    res.json(grade);
  } catch (err) {
    req.log.error({ err }, "Failed to get grade");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/grades/:gradeId", async (req, res) => {
  try {
    const gradeId = parseInt(req.params.gradeId);
    await db.delete(gradesTable).where(eq(gradesTable.id, gradeId));
    res.status(204).send();
  } catch (err) {
    req.log.error({ err }, "Failed to delete grade");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
