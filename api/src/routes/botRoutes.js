// === api/routes/botRoutes.js ===
import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();
const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL || "http://bot:8000";
const LOG_FILE = path.resolve("logs", "bot-logs.json");

const logBotActivity = async (botName, message) => {
  const log = {
    bot: botName,
    message,
    timestamp: new Date().toISOString(),
  };

  let logs = [];

  if (fs.existsSync(LOG_FILE)) {
    const content = fs.readFileSync(LOG_FILE, "utf-8");
    logs = JSON.parse(content || "[]");
  }

  logs.unshift(log);
  fs.writeFileSync(LOG_FILE, JSON.stringify(logs.slice(0, 1000), null, 2));
};

// GET: Terimleri al
router.get("/terms", authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${BOT_SERVICE_URL}/terms`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Bot servisinden terimler alınamadı",
      error: error.message,
    });
  }
});

// POST: Yeni terim ekle
router.post("/terms", authenticateToken, async (req, res) => {
  try {
    const { newTerm } = req.body;
    const response = await axios.post(`${BOT_SERVICE_URL}/terms`, { newTerm });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Bot servisine terim gönderilemedi",
      error: error.message,
    });
  }
});

router.get("/bot-logs", authenticateToken, async (req, res) => {
  if (!fs.existsSync(LOG_FILE)) return res.json([]);
  const content = fs.readFileSync(LOG_FILE, "utf-8");
  const logs = JSON.parse(content || "[]");
  res.json(logs);
});

const botEndpoints = [
  {
    path: "/start-trendyol",
    backend: "/run-trendyol",
    logMsg: "Trendyol botu başlatıldı",
  },
  {
    path: "/run-trendyol-detail",
    backend: "/run-trendyol-detail",
    logMsg: "Trendyol detay botu başlatıldı",
  },
  { path: "/start-n11", backend: "/run-n11", logMsg: "N11 botu başlatıldı" },
  {
    path: "/start-n11-detail",
    backend: "/run-n11-detail",
    logMsg: "N11 detay botu başlatıldı",
  },
  {
    path: "/start-hepsiburada",
    backend: "/run-hepsiburada",
    logMsg: "Hepsiburada botu başlatıldı",
  },
  {
    path: "/start-hepsiburada-detail",
    backend: "/run-hepsiburada-detail",
    logMsg: "Hepsiburada detay botu başlatıldı",
  },
  {
    path: "/start-avansas",
    backend: "/run-avansas",
    logMsg: "Avansas botu başlatıldı",
  },
  {
    path: "/start-avansas-detail",
    backend: "/run-avansas-detail",
    logMsg: "Avansas detay botu başlatıldı",
  },
];

botEndpoints.forEach(({ path, backend, logMsg }) => {
  router.post(path, authenticateToken, async (req, res) => {
    const { bot_name } = req.body;
    if (!bot_name)
      return res
        .status(400)
        .json({ success: false, error: "Bot adı gerekli." });

    try {
      const response = await axios.post(`${BOT_SERVICE_URL}${backend}`, {
        bot_name,
      });
      await logBotActivity(bot_name, logMsg);
      res.json({ success: true, ...response.data });
    } catch (err) {
      console.error(`❌ ${bot_name} bot hatası:`, err.message);
      res.status(500).json({
        success: false,
        error: "Bot çalıştırılamadı",
        detail: err.message,
      });
    }
  });
});

router.get("/health", async (req, res) => {
  try {
    const botHealth = await axios
      .get(`${BOT_SERVICE_URL}/health`)
      .catch(() => ({ status: "error" }));
    res.json({
      api: "healthy",
      bot_service_url: BOT_SERVICE_URL,
      bot_service: botHealth.data || "unreachable",
    });
  } catch (err) {
    res.json({
      api: "healthy",
      bot_service_url: BOT_SERVICE_URL,
      bot_service: "error",
    });
  }
});

export default router;
