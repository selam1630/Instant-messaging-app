import { Router } from "express";
import upload from "../config/multer";
import { uploadFileMessage } from "../controllers/fileController";

const router = Router();

router.post("/upload", upload.array("files", 10), uploadFileMessage);

export default router;
