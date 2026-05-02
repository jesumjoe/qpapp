import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { papersTable } from "./papers";
import { subjectsTable } from "./subjects";

export const questionsTable = pgTable("questions", {
  id: serial("id").primaryKey(),
  paperId: integer("paper_id").notNull().references(() => papersTable.id, { onDelete: "cascade" }),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  answerText: text("answer_text").notNull(),
  marks: integer("marks").notNull().default(1),
  topic: text("topic"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertQuestionSchema = createInsertSchema(questionsTable).omit({ id: true, createdAt: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questionsTable.$inferSelect;
