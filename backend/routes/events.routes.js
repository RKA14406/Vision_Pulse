import { Router } from "express";
import { getEventById, listEvents } from "../controllers/events.controller.js";

const router = Router();

router.get("/", listEvents);
router.get("/:id", getEventById);

export default router;
