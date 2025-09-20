import "dotenv/config";
import mongoose from "mongoose";
import logger from "./utils/logger.js";
import http from "http";
import app from "./app.js";

const PORT = process.env.PORT || 5000;

const DB = process.env.DATABASE?.replace(
    "<password>",
    process.env.DATABASE_PASSWORD
);

mongoose
    .connect(DB)
    .then(() => logger.info("DB connected"))
    .catch((e) => logger.error(`DB error: ${e.message}`));

(async () => {
    try {
        const server = http.createServer(app);
        server.listen(PORT, () => {
            logger.info(`Server on :${PORT}`);
        });
    } catch (e) {
        logger.error(e);
        process.exit(1);
    }
})();
