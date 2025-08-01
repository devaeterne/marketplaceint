import express from "express";
import axios from "axios";

const router = express.Router();
const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL || "http://bot:8000";

/**
 * @swagger
 * /api/start-trendyol:
 *   post:
 *     summary: Trendyol botunu çalıştırır
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bot_name:
 *                 type: string
 *                 example: trendyol
 *     responses:
 *       200:
 *         description: Bot başarıyla çalıştırıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Bot çalıştırılamadı
 */
router.post("/start-trendyol", async (req, res) => {
  const { bot_name } = req.body;
  if (!bot_name) return res.status(400).json({ error: "Bot adı gerekli." });

  try {
    const response = await axios.post(`${BOT_SERVICE_URL}/run-trendyol`, {
      bot_name,
    });
    res.json(response.data);
  } catch (err) {
    console.error("❌ Trendyol bot hatası:", err.message);
    res.status(500).json({ error: "Bot çalıştırılamadı", detail: err.message });
  }
});

/**
 * @swagger
 * /api/run-trendyol-detail:
 *   post:
 *     summary: Trendyol detay botunu çalıştırır
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bot_name:
 *                 type: string
 *                 example: trendyol
 *     responses:
 *       200:
 *         description: Detay bot başarıyla çalıştırıldı
 *       500:
 *         description: Detay bot çalıştırılamadı
 */
router.post("/run-trendyol-detail", async (req, res) => {
  const { bot_name } = req.body;
  if (!bot_name) return res.status(400).json({ error: "Bot adı gerekli." });

  try {
    const response = await axios.post(
      `${BOT_SERVICE_URL}/run-trendyol-detail`,
      { bot_name }
    );
    res.json(response.data);
  } catch (err) {
    console.error("❌ Trendyol detay bot hatası:", err.message);
    res
      .status(500)
      .json({ error: "Detay bot çalıştırılamadı", detail: err.message });
  }
});

/**
 * @swagger
 * /api/start-n11:
 *   post:
 *     summary: N11 botunu çalıştırır
 *     responses:
 *       200:
 *         description: Bot başarıyla çalıştırıldı
 *       500:
 *         description: Bot çalıştırılamadı
 */
router.post("/start-n11", async (req, res) => {
  try {
    const response = await axios.post(`${BOT_SERVICE_URL}/run-n11`);
    res.json(response.data);
  } catch (err) {
    console.error("❌ N11 bot hatası:", err.message);
    res.status(500).json({ error: "Bot çalıştırılamadı", detail: err.message });
  }
});

/**
 * @swagger
 * /api/start-n11-detail:
 *   post:
 *     summary: N11 detay botunu çalıştırır
 *     responses:
 *       200:
 *         description: Detay bot başarıyla çalıştırıldı
 *       500:
 *         description: Detay bot çalıştırılamadı
 */
router.post("/start-n11-detail", async (req, res) => {
  try {
    const response = await axios.post(`${BOT_SERVICE_URL}/run-n11-detail`);
    res.json(response.data);
  } catch (err) {
    console.error("❌ N11 detay bot hatası:", err.message);
    res
      .status(500)
      .json({ error: "Detay bot çalıştırılamadı", detail: err.message });
  }
});

/**
 * @swagger
 * /api/start-hepsiburada:
 *   post:
 *     summary: Hepsiburada botunu çalıştırır
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bot_name:
 *                 type: string
 *                 example: hepsiburada
 *     responses:
 *       200:
 *         description: Bot başarıyla çalıştırıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Bot çalıştırılamadı
 */
router.post("/start-hepsiburada", async (req, res) => {
  const { bot_name } = req.body;
  if (!bot_name) return res.status(400).json({ error: "Bot adı gerekli." });

  try {
    const response = await axios.post(`${BOT_SERVICE_URL}/run-hepsiburada`, {
      bot_name,
    });
    res.json(response.data);
  } catch (err) {
    console.error("❌ Hepsiburada bot hatası:", err.message);
    res.status(500).json({ error: "Bot çalıştırılamadı", detail: err.message });
  }
});

/**
 * @swagger
 * /api/start-hepsiburada-detail:
 *   post:
 *     summary: Hepsiburada detay botunu çalıştırır
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bot_name:
 *                 type: string
 *                 example: hepsiburada
 *     responses:
 *       200:
 *         description: Detay bot başarıyla çalıştırıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Detay bot çalıştırılamadı
 */
router.post("/start-hepsiburada-detail", async (req, res) => {
  const { bot_name } = req.body;
  if (!bot_name) return res.status(400).json({ error: "Bot adı gerekli." });

  try {
    const response = await axios.post(
      `${BOT_SERVICE_URL}/run-hepsiburada-detail`,
      { bot_name }
    );
    res.json(response.data);
  } catch (err) {
    console.error("❌ Hepsiburada detay bot hatası:", err.message);
    res
      .status(500)
      .json({ error: "Detay bot çalıştırılamadı", detail: err.message });
  }
});

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: API ve bot servisi sağlık durumu
 *     responses:
 *       200:
 *         description: Durum bilgisi
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
