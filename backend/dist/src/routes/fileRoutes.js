"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const fileController_1 = require("../controllers/fileController");
const multer_1 = require("../config/multer");
const router = express_1.default.Router();
router.post("/upload", multer_1.upload.single("file"), fileController_1.uploadFile);
exports.default = router;
