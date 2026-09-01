import express from "express";
import { getScorecard, getTeam,} from "../controllers/sportsController.js";

const router = express.Router();

router.get("/scorecard/:matchId", getScorecard);
router.get( "/team/:matchId/:teamId",getTeam);

export default router;