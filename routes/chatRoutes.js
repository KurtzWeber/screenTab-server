import express from "express";
import { protect } from "../middleware/auth.js";
import {
    sendMessage,
    listThreads,
    history,
    wipeMine,
    deleteThread,
} from "../controllers/chatController.js";

const router = express.Router();

router.post("/send", protect, sendMessage);
router.get("/threads", protect, listThreads);
router.get("/history", protect, history);
router.delete("/wipe", protect, wipeMine);
router.delete("/thread/:id", protect, deleteThread);

export default router;
