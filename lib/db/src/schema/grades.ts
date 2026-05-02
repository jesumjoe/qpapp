import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gradesTable = pgTable("grades", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: text("level").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGradeSchema = createInsertSchema(gradesTable).omit({ id: true, createdAt: true });
export type InsertGrade = z.infer<typeof insertGradeSchema>;
export type Grade = typeof gradesTable.$inferSelect;
