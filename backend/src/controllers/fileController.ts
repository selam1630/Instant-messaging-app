import { Request, Response } from "express";
import path from "path";
import fs from "fs";

export const uploadFile = (req: Request, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  return res.status(201).json({
    message: "File uploaded successfully",
    fileUrl,
  });
};
