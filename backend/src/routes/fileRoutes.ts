import express from "express";
import { uploadFile } from "../controllers/fileController";
import { upload } from "../config/multer";

const router = express.Router();
router.post("/upload", upload.single("file"), uploadFile);

export default router;
