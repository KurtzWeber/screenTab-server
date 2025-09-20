import jwt from "jsonwebtoken";
import safe from "../utils/safeReply.js";

export const protect = (req, res, next) => {
    try {
        const h = req.headers.authorization || "";
        const b = h.startsWith("Bearer") ? h.split(" ")[1] : null;

        const token = req.cookies?.auth || b;
        if (!token) {
            return safe.fail(
                res,
                "UNAUTHORIZED",
                "Not authorized, no token",
                401
            );
        }

        const dec = jwt.verify(token, process.env.JWT_SECRET);

        const now = Math.floor(Date.now() / 1000);
        if (dec.exp < now) {
            return safe.fail(res, "UNAUTHORIZED", "Token expired", 401);
        }

        req.user = { id: dec.sub, role: dec.role };
        return next();
    } catch (e) {
        const msg =
            e?.name === "TokenExpiredError"
                ? "Token expired"
                : "Not authorized, token failed";

        return safe.fail(res, "UNAUTHORIZED", msg, 401);
    }
};
