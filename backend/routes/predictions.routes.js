import { Router } from "express";
import { createPrediction, listPredictions } from "../controllers/predictions.controller.js";

const router = Router();

router.get("/", listPredictions);
router.post("/generate", createPrediction);

export default router;
