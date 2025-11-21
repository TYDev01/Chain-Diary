import { Router } from "express";
import entryController from "../controllers/entry.controller";

const router = Router();

router.post("/create", (req, res) => entryController.createEntry(req, res));

export default router;
