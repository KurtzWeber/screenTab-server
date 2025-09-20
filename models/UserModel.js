import mongoose from "mongoose";

const UserModelSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            index: true,
            unique: true,
            required: true,
            lowercase: true,
            trim: true,
        },
        username: {
            type: String,
            index: true,
            lowercase: true,
            trim: true,
        },
        passwordHash: {
            type: String,
            required: true,
        },
        role: { type: String, default: "user" },
    },
    { timestamps: true }
);

UserModelSchema.index(
    { email: 1 },
    {
        unique: true,
    }
);

export default mongoose.model("UserModel", UserModelSchema);
