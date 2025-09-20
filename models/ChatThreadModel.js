import mongoose from "mongoose";

const S = mongoose.Schema;

const ChatThread = new S(
    {
        title: { type: String, required: true, trim: true },
        userId: {
            type: S.Types.ObjectId,
            ref: "UserModel",
            required: true,
            index: true,
        },
    },
    { timestamps: true }
);

ChatThread.index({ userId: 1, updatedAt: -1 });
ChatThread.index({ userId: 1, title: 1 }, { unique: true });

export default mongoose.model("ChatThread", ChatThread);
