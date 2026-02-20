/**
 * API điều khiển seed từ production: Start (chạy nền) và Stop (dừng bằng AbortSignal).
 * Chỉ hoạt động khi backend chạy long-running (Railway, local). Vercel serverless không giữ process.
 */
import { Router } from "express";
import { runSeed } from "../seed/seed.js";

export const seedRouter = Router();

function getSeedSecret() {
  return process.env.SEED_SECRET || null;
}

function checkSeedAuth(req) {
  const secret = getSeedSecret();
  if (!secret) return true;
  const header = req.get("X-Seed-Secret") || req.get("Authorization")?.replace(/^Bearer\s+/i, "");
  return header === secret;
}

seedRouter.get("/status", (req, res) => {
  const running = Boolean(req.app.locals.seedAbortController);
  res.json({ running });
});

seedRouter.post("/start", async (req, res) => {
  if (!checkSeedAuth(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (req.app.locals.seedAbortController) {
    return res.status(409).json({ error: "Seed already running", running: true });
  }
  const controller = new AbortController();
  req.app.locals.seedAbortController = controller;
  const baseUrl = req.protocol + "://" + req.get("host");
  runSeed({
    signal: controller.signal,
    apiUrl: process.env.API_URL || baseUrl,
  })
    .then(() => {
      if (req.app.locals.seedAbortController === controller) {
        req.app.locals.seedAbortController = null;
      }
    })
    .catch((err) => {
      console.error("Seed error:", err);
      if (req.app.locals.seedAbortController === controller) {
        req.app.locals.seedAbortController = null;
      }
    });
  res.status(202).json({ message: "Seed started", running: true });
});

seedRouter.post("/stop", (req, res) => {
  if (!checkSeedAuth(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const controller = req.app.locals.seedAbortController;
  if (!controller) {
    return res.json({ message: "Seed not running", running: false });
  }
  controller.abort();
  req.app.locals.seedAbortController = null;
  res.json({ message: "Seed stop requested", running: false });
});
