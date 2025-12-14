import { Request, Response } from "express";
import { prisma } from "../config/db";

// Add a contact by phone number
export const addContact = async (req: Request, res: Response) => {
  const { userId, phoneNumber } = req.body;

  if (!userId || !phoneNumber) {
    return res.status(400).json({ message: "userId and phoneNumber are required" });
  }

  try {
    // Find the user with the given phone number
    const contactUser = await prisma.user.findFirst({ where: { phoneNumber } });

    if (!contactUser) {
      return res.status(404).json({ message: "User with this phone number not found" });
    }

    // Prevent adding self as contact
    if (contactUser.id === userId) {
      return res.status(400).json({ message: "You cannot add yourself as a contact" });
    }

    // Check if contact already exists
    const existing = await prisma.contact.findFirst({
      where: { userId, contactId: contactUser.id },
    });

    if (existing) {
      return res.status(400).json({ message: "Contact already added" });
    }

    // Add contact
    const contact = await prisma.contact.create({
      data: {
        userId,
        contactId: contactUser.id,
      },
    });

    res.status(201).json({ message: "Contact added successfully", contact });
  } catch (err) {
    console.error("Add contact error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// Get all contacts for a user
export const getContacts = async (req: Request, res: Response) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  try {
    const contacts = await prisma.contact.findMany({
      where: { userId },
      include: { contact: true }, // include contact user details
      orderBy: { createdAt: "desc" },
    });

    const formatted = contacts.map((c) => ({
      id: c.contact.id,
      name: c.contact.name,
      email: c.contact.email,
      phoneNumber: c.contact.phoneNumber,
      profileImage: c.contact.profileImage,
      onlineStatus: c.contact.onlineStatus,
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Get contacts error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
