// === api/routes/botRoutes.js ===
import express from "express";
import axios from "axios";
import fs from "fs";
import path from "path";
import { authenticateToken, requireRole } from "../middleware/auth.js";

const router = express.Router();
const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL || "http://bot:8000";
const LOG_FILE = path.join(process.cwd(), "logs", "bot-logs.json");

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

/**
 * @swagger
 * components:
 *   schemas:
 *     BotRequest:
 *       type: object
 *       required:
 *         - bot_name
 *       properties:
 *         bot_name:
 *           type: string
 *           description: Bot adı
 *           example: "my-bot"
 *     BotResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *     HealthResponse:
 *       type: object
 *       properties:
 *         api:
 *           type: string
 *         bot_service_url:
 *           type: string
 *         bot_service:
 *           type: object
 */

/**
 * @swagger
 * /api/terms:
 *   get:
 *     summary: Arama terimlerini getir
 *     tags: [Bot Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 terms:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Sunucu hatası
 *   post:
 *     summary: Arama terimlerini güncelle
 *     tags: [Bot Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               terms:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Terimler güncellendi
 *       500:
 *         description: Sunucu hatası
 */
router.get("/terms", authenticateToken, async (req, res) => {
  try {
    const response = await axios.get(`${BOT_SERVICE_URL}/terms`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Terimler alınamadı",
      error: err.message,
    });
  }
});

router.post("/terms", authenticateToken, async (req, res) => {
  try {
    const response = await axios.post(`${BOT_SERVICE_URL}/terms`, req.body);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Terimler güncellenemedi",
      error: err.message,
    });
  }
});

/**
 * @swagger
 * /api/bot-logs:
 *   get:
 *     summary: Bot loglarını getir
 *     tags: [Bot Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bot logları
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   bot:
 *                     type: string
 *                   message:
 *                     type: string
 *                   timestamp:
 *                     type: string
 */
router.get("/bot-logs", authenticateToken, async (req, res) => {
  if (!fs.existsSync(LOG_FILE)) return res.json([]);
  const content = fs.readFileSync(LOG_FILE, "utf-8");
  const logs = JSON.parse(content || "[]");
  res.json(logs);
});

/**
 * @swagger
 * /api/start-trendyol:
 *   post:
 *     summary: Trendyol botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BotResponse'
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-trendyol-detail:
 *   post:
 *     summary: Trendyol detay botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-n11:
 *   post:
 *     summary: N11 botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-n11-detail:
 *   post:
 *     summary: N11 detay botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-hepsiburada:
 *   post:
 *     summary: Hepsiburada botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-hepsiburada-detail:
 *   post:
 *     summary: Hepsiburada detay botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-avansas:
 *   post:
 *     summary: Avansas botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-avansas-detail:
 *   post:
 *     summary: Avansas detay botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

const botEndpoints = [
  {
    path: "/start-trendyol",
    backend: "/run-trendyol",
    logMsg: "Trendyol botu başlatıldı",
  },
  {
    path: "/start-trendyol-detail",
    backend: "/run-trendyol-detail",
    logMsg: "Trendyol detay botu başlatıldı",
  },
  {
    path: "/start-n11",
    backend: "/run-n11",
    logMsg: "N11 botu başlatıldı",
  },
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

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Sistem durumunu kontrol et
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Sistem durumu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */
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
