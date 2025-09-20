import "dotenv/config";

const need = (k) => {
    const v = process.env[k];
    if (!v) {
        console.error(`Missing ${k}`);
        process.exit(1);
    }
    return v;
};

const enc = (v) => encodeURIComponent(v || "");

export const ENV = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 5000),
    frontOrigin: need("FRONT_ORIGIN"),
    jwtSecret: need("JWT_SECRET"),
    dbUri: need("DATABASE").replace(
        "<password>",
        enc(need("DATABASE_PASSWORD"))
    ),
    omdbKey: need("OMDB_API_KEY"),
};
