// src/routes/productRoutes.js
import express from "express";
import pool from "../db.js";

const router = express.Router();

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Tüm ürünleri getirir
 *     responses:
 *       200:
 *         description: Ürün listesi
 */
router.get("/products", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM products ORDER BY updated_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Veritabanı hatası", detail: err.message });
  }
});

/**
 * @swagger
 * /api/product_price_logs:
 *   get:
 *     summary: Tüm fiyat kayıtlarını getirir
 *     responses:
 *       200:
 *         description: Fiyat geçmişi listesi
 */
router.get("/product_price_logs", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM product_price_logs ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Veritabanı hatası", detail: err.message });
  }
});

/**
 * @swagger
 * /api/product_details:
 *   get:
 *     summary: Tüm ürün detaylarını getirir
 *     responses:
 *       200:
 *         description: Detay listesi
 */
router.get("/product_details", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM product_details ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Veritabanı hatası", detail: err.message });
  }
});
/**
 * @swagger
 * /api/product_attributes:
 *   get:
 *     summary: Tüm ürün özelliklerini getirir
 *     responses:
 *       200:
 *         description: Özellik listesi
 */
router.get("/product_attributes", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM product_attributes ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Veritabanı hatası", detail: err.message });
  }
});

export default router;
