import express from "express";
import fs from "fs";
import path from "path";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();
const TERMS_FILE = path.resolve("bot/search_terms/terms.txt");

// GET: Arama kelimelerini getir
router.get("/search-terms", authenticateToken, (req, res) => {
  try {
    const content = fs.readFileSync(TERMS_FILE, "utf-8");
    const terms = content.split("\n").filter(Boolean);
    res.json({ success: true, terms });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Kelimeler okunamadı",
      error: err.message,
    });
  }
});

// POST: Yeni bir arama kelimesi ekle
router.post("/search-terms", authenticateToken, (req, res) => {
  const { term } = req.body;
  if (!term || typeof term !== "string") {
    return res
      .status(400)
      .json({ success: false, message: "Geçerli bir arama kelimesi gerekli" });
  }

  try {
    fs.appendFileSync(TERMS_FILE, `${term.trim()}\n`);
    res.json({ success: true, message: "Kelime eklendi" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Kelime eklenemedi",
      error: err.message,
    });
  }
});

// PUT: Tüm arama kelimelerini güncelle
router.put("/search-terms", authenticateToken, (req, res) => {
  const { terms } = req.body;
  if (!Array.isArray(terms)) {
    return res
      .status(400)
      .json({ success: false, message: "terms bir dizi olmalı" });
  }

  try {
    const content =
      terms
        .map((t) => t.trim())
        .filter(Boolean)
        .join("\n") + "\n";
    fs.writeFileSync(TERMS_FILE, content);
    res.json({ success: true, message: "Arama kelimeleri güncellendi" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Dosya güncellenemedi",
      error: err.message,
    });
  }
});

export default router;
