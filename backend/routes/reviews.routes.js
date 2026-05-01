import { Router } from "express";
import { listReviews, reviewSummary, runReviews } from "../controllers/reviews.controller.js";

const router = Router();

router.get("/", listReviews);
router.get("/summary", reviewSummary);
router.post("/run", runReviews);

export default router;
