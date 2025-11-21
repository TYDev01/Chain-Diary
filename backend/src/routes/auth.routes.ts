import { Router } from "express";
import authController from "../controllers/auth.controller";

const router = Router();

router.post("/session", (req, res) => authController.createSession(req, res));

export default router;
