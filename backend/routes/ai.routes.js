import { Router } from "express";
import { aiStatus } from "../controllers/ai.controller.js";

const router = Router();

router.get("/status", aiStatus);

export default router;
