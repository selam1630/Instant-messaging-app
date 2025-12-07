import express from "express";
import { deleteMessage } from "../controllers/messageController";

const router = express.Router();
router.post("/delete", deleteMessage);

export default router;
