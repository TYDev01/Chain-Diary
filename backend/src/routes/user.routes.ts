import { Router } from "express";
import userController from "../controllers/user.controller";

const router = Router();

router.get("/status/:address", (req, res) => userController.getUserStatus(req, res));

export default router;
