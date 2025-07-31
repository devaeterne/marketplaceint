import express from "express";
import axios from "axios";

const router = express.Router();

/**
 * @swagger
 * /api/start:
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

  if (!bot_name) {
    return res.status(400).json({ error: "Bot adı gerekli." });
  }

  try {
    const response = await axios.post("http://bot:8000/run-trednyol", {
      bot_name,
    });
    res.json(response.data);
  } catch (err) {
    console.error("❌ Bot çalıştırma hatası:", err.message);
    res.status(500).json({ error: "Bot çalıştırılamadı", detail: err.message });
  }
});

/**
 * @swagger
 * /api/run-detail:
 *   post:
 *     summary: Trendyol detay botunu çalıştırır
 *     responses:
 *       200:
 *         description: Detay bot başarıyla çalıştırıldı
 *       500:
 *         description: Detay bot çalıştırılamadı
 */
router.post("/run-trendyol-detail", async (req, res) => {
  try {
    const response = await axios.post("http://bot:8000/run-trendyol-detail");
    res.json(response.data);
  } catch (err) {
    console.error("❌ Detay bot çalıştırma hatası:", err.message);
    res
      .status(500)
      .json({ error: "Detay bot çalıştırılamadı", detail: err.message });
  }
});

/**
 * @openapi
 * /api/start-n11:
 *   post:
 *     summary: N11 botunu başlatır
 *     responses:
 *       200:
 *         description: Başarıyla çalıştırıldı
 */
router.post("/start-n11", async (req, res) => {
  try {
    const response = await axios.post(`${process.env.BOT_SERVICE_URL}/run-n11`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Bot çalıştırılamadı", detail: err.message });
  }
});

/**
 * @openapi
 * /api/start-n11-detail:
 *   post:
 *     summary: N11 detay botunu başlatır
 *     responses:
 *       200:
 *         description: Başarıyla çalıştırıldı
 */
router.post("/start-n11-detail", async (req, res) => {
  try {
    const response = await axios.post(
      `${process.env.BOT_SERVICE_URL}/run-n11-detail`
    );
    res.json(response.data);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Detay bot çalıştırılamadı", detail: err.message });
  }
});

export default router;
