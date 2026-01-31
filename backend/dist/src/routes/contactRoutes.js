"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const contactsController_1 = require("../controllers/contactsController");
const router = (0, express_1.Router)();
// Add a contact by phone number
router.post("/add", contactsController_1.addContact);
// Get all contacts for a user
router.get("/:userId", contactsController_1.getContacts);
exports.default = router;
