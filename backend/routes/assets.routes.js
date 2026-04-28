import { Router } from "express";
import { getAssetBySymbol, listAssets } from "../controllers/assets.controller.js";

const router = Router();

router.get("/", listAssets);
router.get("/:symbol", getAssetBySymbol);

export default router;
