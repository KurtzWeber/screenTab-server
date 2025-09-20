import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import UserModel from "../models/UserModel.js";
import safe from "../utils/safeReply.js";

const emailRx = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const passRx = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

const signJwt = (user) => {
    return jwt.sign(
        { sub: user._id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
    );
};

const cookieOpts = () => ({
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
});

const setAuth = (res, token) => {
    res.cookie("auth", token, cookieOpts());
};

export const register = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return safe.fail(
                res,
                "BAD_REQUEST",
                "Email and password required",
                400
            );
        }
        if (!emailRx.test(email)) {
            return safe.fail(res, "VALIDATION_ERROR", "Invalid email", 400);
        }
        if (!passRx.test(password)) {
            return safe.fail(res, "VALIDATION_ERROR", "Weak password", 400);
        }

        const norm = email.toLowerCase().trim();
        const exists = await UserModel.findOne({
            email: norm,
        }).lean();

        if (exists) {
            return safe.fail(res, "EMAIL_EXISTS", "Email already in use", 409);
        }

        const hash = await bcrypt.hash(password, 12);
        const user = await UserModel.create({
            email: norm,
            username: norm,
            passwordHash: hash,
        });

        const token = signJwt(user);
        setAuth(res, token);

        return safe.ok(res, { userId: user._id }, 201);
    } catch (e) {
        return safe.fail(res, "INTERNAL", "Internal error", 500);
    }
};

export const login = async (req, res) => {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return safe.fail(
                res,
                "BAD_REQUEST",
                "Email and password required",
                400
            );
        }

        const norm = email.toLowerCase().trim();
        const user = await UserModel.findOne({
            email: norm,
        });

        if (!user) {
            return safe.fail(res, "UNAUTHORIZED", "Invalid credentials", 401);
        }

        const ok = await bcrypt.compare(password, user.passwordHash || "");
        if (!ok) {
            return safe.fail(res, "UNAUTHORIZED", "Invalid credentials", 401);
        }

        const token = signJwt(user);
        setAuth(res, token);

        return safe.ok(res, { userId: user._id });
    } catch (e) {
        return safe.fail(res, "INTERNAL", "Internal error", 500);
    }
};

export const check = (req, res) => {
    try {
        const raw =
            req.cookies?.auth ||
            (req.headers.authorization || "").split(" ")[1];

        if (!raw) return safe.ok(res, { auth: false });

        const dec = jwt.verify(raw, process.env.JWT_SECRET);
        const now = Math.floor(Date.now() / 1000);
        if (dec.exp < now) return safe.ok(res, { auth: false });

        return safe.ok(res, { auth: true });
    } catch {
        return safe.ok(res, { auth: false });
    }
};

export const logout = (req, res) => {
    res.cookie("auth", "", {
        ...cookieOpts(),
        maxAge: 0,
    });
    return safe.ok(res, { message: "Logged out" });
};
