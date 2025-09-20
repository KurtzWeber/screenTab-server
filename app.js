import "dotenv/config";
import express from "express";
import cors from "cors";
import cookie from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import userRoutes from "./routes/userRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

const origin = process.env.FRONT_ORIGIN || "http://localhost:3000";

app.set("trust proxy", 1);

app.use(helmet());
app.use(
    cors({
        origin,
        credentials: true,
    })
);
app.use(express.json({ limit: "1mb" }));
app.use(cookie());
app.use(morgan("tiny"));

app.use("/", userRoutes);
app.use("/chat", chatRoutes);

app.use((req, res) => {
    res.status(404).json({
        ok: false,
        code: "NOT_FOUND",
        message: "Route not found",
    });
});

app.use((err, req, res, next) => {
    // eslint-disable-next-line no-console
    console.error(err);
    res.status(500).json({
        ok: false,
        code: "INTERNAL",
        message: "Internal error",
    });
});

export default app;
