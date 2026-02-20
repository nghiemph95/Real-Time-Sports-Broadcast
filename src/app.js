/**
 * Express app (chỉ REST, không WebSocket).
 * Dùng cho: chạy local (index.js gắn thêm server + WS) và Vercel Serverless (api/[[...path]].js).
 */
import express from "express";
import cors from "cors";
import { matchRouter } from "./route/matches.js";
import { commentaryRouter } from "./route/commentary.js";
import { seedRouter } from "./route/seed.js";
import { securityMiddleware } from "./arcjet.js";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN;
const origins = corsOrigin
  ? corsOrigin.split(",").map((o) => o.trim())
  : ["http://localhost:5173", "http://127.0.0.1:5173"];
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hello from Express server!");
});

app.use(securityMiddleware());
app.use("/matches", matchRouter);
app.use("/matches/:id/commentary", commentaryRouter);
app.use("/seed", seedRouter);

// Trên Vercel serverless không có WebSocket → broadcast là no-op (route vẫn check app.locals trước khi gọi)
app.locals.broadcastMatchCreated = null;
app.locals.broadcastCommentary = null;
app.locals.seedAbortController = null;

export default app;
