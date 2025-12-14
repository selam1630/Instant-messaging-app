import { Router } from "express";
import { addContact, getContacts } from "../controllers/contactsController";

const router = Router();

// Add a contact by phone number
router.post("/add", addContact);

// Get all contacts for a user
router.get("/:userId", getContacts);

export default router;
