import { Request, Response } from "express";
import path from "path";
import fs from "fs";

export const uploadFile = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  // Optional: Log the full path to confirm the file was saved
  console.log("Saved file at:", req.file.path);
  if (!fs.existsSync(req.file.path)) {
    console.error("File not found after upload!");
    return res.status(500).json({ message: "File not saved" });
  }

  // Return absolute URL
  const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;

  return res.status(201).json({
    message: "File uploaded successfully",
    fileUrl,
  });
};
