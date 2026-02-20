// import AgentAPI from "apminsight";
// AgentAPI.config();

import express from "express";
import http from "http";
import cors from "cors";
import { matchRouter } from "./route/matches.js";
import { commentaryRouter } from "./route/commentary.js";
import { attachWebSocketServer } from "./ws/server.js";
import { securityMiddleware } from "./arcjet.js";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

const app = express();
const server = http.createServer(app);

// CORS: cho phép frontend (Vercel, localhost) gọi API. Production set CORS_ORIGIN=https://your-app.vercel.app
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

const { broadcastMatchCreated, broadcastCommentary } =
  attachWebSocketServer(server);
app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;

server.listen(PORT, HOST, () => {
  const baseUrl =
    HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

  console.log(`Server is running on ${baseUrl}`);
  console.log(
    `WebSocket Server is running on ${baseUrl.replace("http", "ws")}/ws`,
  );
});
