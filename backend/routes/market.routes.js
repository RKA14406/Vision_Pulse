import { Router } from "express";
import { quote, quotes } from "../controllers/market.controller.js";

const router = Router();

router.get("/quote/:symbol", quote);
router.get("/quotes", quotes);

export default router;
