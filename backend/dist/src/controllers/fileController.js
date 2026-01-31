"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFile = void 0;
const fs_1 = __importDefault(require("fs"));
const uploadFile = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
    }
    console.log("Saved file at:", req.file.path);
    if (!fs_1.default.existsSync(req.file.path)) {
        console.error("File not found after upload!");
        return res.status(500).json({ message: "File not saved" });
    }
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    return res.status(201).json({
        message: "File uploaded successfully",
        fileUrl,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
    });
};
exports.uploadFile = uploadFile;
