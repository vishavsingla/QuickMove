import dotenv from "dotenv";
import path from "path";

// Load test env WITHOUT overriding anything already set (e.g. by CI).
dotenv.config({ path: path.resolve(__dirname, "..", ".env.test") });

process.env.NODE_ENV = "test";
