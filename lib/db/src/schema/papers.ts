import { pgTable, serial, text, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { subjectsTable } from "./subjects";

export const extractionStatusEnum = pgEnum("extraction_status", ["pending", "processing", "done", "failed"]);

export const papersTable = pgTable("papers", {
  id: serial("id").primaryKey(),
  subjectId: integer("subject_id").notNull().references(() => subjectsTable.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  title: text("title").notNull(),
  fileObjectPath: text("file_object_path"),
  extractionStatus: extractionStatusEnum("extraction_status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPaperSchema = createInsertSchema(papersTable).omit({ id: true, createdAt: true, extractionStatus: true });
export type InsertPaper = z.infer<typeof insertPaperSchema>;
export type Paper = typeof papersTable.$inferSelect;
