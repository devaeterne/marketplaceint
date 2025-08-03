import express from "express";
import axios from "axios";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

const BOT_SERVICE_URL = process.env.BOT_SERVICE_URL || "http://bot:8000";

// GET terms
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
