import { Router } from "express";
import { listNews } from "../controllers/news.controller.js";

const router = Router();

router.get("/", listNews);

export default router;
