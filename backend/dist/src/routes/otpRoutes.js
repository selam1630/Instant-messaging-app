"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const otpController_1 = require("../controllers/otpController");
const router = (0, express_1.Router)();
router.post("/send", otpController_1.sendOTP);
router.post("/verify", otpController_1.verifyOTP);
exports.default = router;
