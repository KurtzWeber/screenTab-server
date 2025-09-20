import User from "../models/UserModel.js";
import safe from "../utils/safeReply.js";

export const listUsers = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page || "1", 10));
        const limit = Math.min(
            100,
            Math.max(1, parseInt(req.query.limit || "15", 10))
        );
        const skip = (page - 1) * limit;

        const [items, total] = await Promise.all([
            User.find({}, { email: 1, createdAt: 1, _id: 0 })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            User.countDocuments({}),
        ]);

        return safe.ok(res, { items, total });
    } catch (e) {
        return safe.fail(res, "INTERNAL", "Internal error", 500);
    }
};
