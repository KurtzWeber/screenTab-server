import mongoose from "mongoose";

const S = mongoose.Schema;

const ChatMessage = new S(
    {
        threadId: {
            type: S.Types.ObjectId,
            ref: "ChatThread",
            required: true,
        },
        role: {
            type: String,
            enum: ["user", "bot"],
            required: true,
        },
        text: { type: String, required: true },
        omdb: { type: S.Types.Mixed, default: null },
    },
    { timestamps: true }
);

ChatMessage.index({ threadId: 1, createdAt: 1 });

export default mongoose.model("ChatMessage", ChatMessage);
