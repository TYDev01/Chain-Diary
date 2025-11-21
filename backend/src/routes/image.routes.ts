import { Router } from "express";
import imageController from "../controllers/image.controller";

const router = Router();

router.post("/upload", (req, res) => imageController.uploadImage(req, res));

export default router;
