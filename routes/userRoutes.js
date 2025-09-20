import express from "express";
import {
    register,
    login,
    check,
    logout,
} from "../controllers/authController.js";
import { listUsers } from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/auth/register", register);
router.post("/auth/login", login);
router.get("/auth/check", check);

router.post("/auth/logout", logout);

router.get("/users", protect, listUsers);

export default router;
