import Dexie, { type Table } from 'dexie';

export interface Grade {
  id?: number;
  name: string;
  level: string;
  createdAt: number;
}

export interface Subject {
  id?: number;
  gradeId: number;
  name: string;
  createdAt: number;
}

export interface Paper {
  id?: number;
  subjectId: number;
  title: string;
  year?: number;
  fileUrl?: string;
  createdAt: number;
}

export interface Question {
  id?: number;
  paperId: number;
  subjectId: number;
  questionText: string;
  answerText: string;
  marks: number;
  topic?: string;
  createdAt: number;
  // SRS Fields
  nextReviewDate?: number;
  interval?: number; // In days
  easeFactor?: number;
  consecutiveCorrect?: number;
}

export interface Attempt {
  id?: number;
  subjectId: number;
  sessionId: string;
  questionId: number;
  correct: boolean;
  timestamp: number;
  // Feedback from evaluation
  marksObtained?: number;
  feedback?: string;
}

export class QpAppDatabase extends Dexie {
  grades!: Table<Grade>;
  subjects!: Table<Subject>;
  papers!: Table<Paper>;
  questions!: Table<Question>;
  attempts!: Table<Attempt>;

  constructor() {
    super('QpAppDatabase');
    this.version(2).stores({
      grades: '++id, name, level',
      subjects: '++id, gradeId, name',
      papers: '++id, subjectId, title',
      questions: '++id, paperId, subjectId, topic, nextReviewDate',
      attempts: '++id, subjectId, sessionId, questionId'
    }).upgrade(tx => {
       // Optional: logic for existing data
    });
  }
}

export const db = new QpAppDatabase();
