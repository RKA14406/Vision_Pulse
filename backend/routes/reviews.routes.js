import { Router } from "express";
import { listReviews, reviewSummary } from "../controllers/reviews.controller.js";

const router = Router();

router.get("/", listReviews);
router.get("/summary", reviewSummary);

export default router;
