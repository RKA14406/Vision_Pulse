import { Router } from "express";
import { fredSeries, macroOverview, oilSnapshot } from "../controllers/macro.controller.js";

const router = Router();

router.get("/overview", macroOverview);
router.get("/fred/:seriesId", fredSeries);
router.get("/energy/oil", oilSnapshot);

export default router;
