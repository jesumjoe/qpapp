import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gradesRouter from "./grades";
import subjectsRouter from "./subjects";
import papersRouter from "./papers";
import questionsRouter from "./questions";
import storageRouter from "./storage";
import performanceRouter from "./performance";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gradesRouter);
router.use(subjectsRouter);
router.use(papersRouter);
router.use(questionsRouter);
router.use(storageRouter);
router.use(performanceRouter);

export default router;
