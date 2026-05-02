import { pgTable, serial, integer, boolean, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { questionsTable } from "./questions";
import { subjectsTable } from "./subjects";

export const revisionAttemptsTable = pgTable("revision_attempts", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  questionId: integer("question_id").notNull().references(() => questionsTable.id, { onDelete: "cascade" }),
  correct: boolean("correct").notNull(),
  sessionId: text("session_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertRevisionAttemptSchema = createInsertSchema(revisionAttemptsTable).omit({ id: true, createdAt: true });
export type InsertRevisionAttempt = z.infer<typeof insertRevisionAttemptSchema>;
export type RevisionAttempt = typeof revisionAttemptsTable.$inferSelect;
