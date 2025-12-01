import { Request, Response } from "express";
import { prisma } from "../config/db";

// Extend Request to include `file` (for single upload)
interface MulterRequest extends Request {
  file: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
    size: number;
    destination: string;
    filename: string;
    path: string;
    buffer?: Buffer;
  };
  // For multiple files: files?: MulterRequest["file"][];
}

// Upload a single file and save message
export const uploadFile = async (req: MulterRequest, res: Response) => {
  try {
    const { conversationId, senderId, receiverId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "File is missing" });
    }

    // Save message in DB
    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        receiverId,
        content: "", // optional text
        mediaUrls: [file.path], // store uploaded file path
        status: "sent",
      },
    });

    return res.json(message);
  } catch (err) {
    console.error("Error uploading file:", err);
    return res.status(500).json({ message: "Failed to upload file" });
  }
};
