import express from "express";
import axios from "axios";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL || "http://bot:8000";

// GET terms
/**
 * @swagger
 * /api/terms:
 *   get:
 *     summary: Bot terimlerini getir
 *     tags: [Search Terms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Terimler listesi
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

// POST terms
/**
 * @swagger
 * /api/terms:
 *   post:
 *     summary: Bot terimlerini güncelle
 *     tags: [Search Terms]
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
 *         description: Güncellendi
 *       500:
 *         description: Sunucu hatası
 */
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

export default router;
