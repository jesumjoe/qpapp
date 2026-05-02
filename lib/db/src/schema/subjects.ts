import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { gradesTable } from "./grades";

export const subjectsTable = pgTable("subjects", {
  id: serial("id").primaryKey(),
  gradeId: integer("grade_id").notNull().references(() => gradesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  code: text("code"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSubjectSchema = createInsertSchema(subjectsTable).omit({ id: true, createdAt: true });
export type InsertSubject = z.infer<typeof insertSubjectSchema>;
export type Subject = typeof subjectsTable.$inferSelect;
