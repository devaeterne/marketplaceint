// src/routes/productRoutes.js
import express from "express";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

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
router.get("/products", authenticateToken, async (req, res) => {
  const {
    page = 1,
    limit = 20,
    platform,
    product_type,
    attribute_name,
    attribute_value,
    search,
    sort_by = "created_at",
    sort_order = "desc",
  } = req.query;

  const offset = (page - 1) * limit;

  try {
    const countQuery = `
      SELECT COUNT(*) FROM products p
      LEFT JOIN product_details pd ON pd.product_id = p.id
      WHERE 1 = 1
        AND ($1::text IS NULL OR p.platform = $1)
        AND ($2::text IS NULL OR pd.product_type ILIKE '%' || $2 || '%')
        AND (
          $3::text IS NULL OR EXISTS (
            SELECT 1 FROM product_attributes pa
            WHERE pa.product_id = p.id
              AND pa.attribute_name = $3
              AND pa.attribute_value ILIKE '%' || $4 || '%'
          )
        )
        AND ($5::text IS NULL OR p.title ILIKE '%' || $5 || '%' OR p.brand ILIKE '%' || $5 || '%')
    `;

    const dataQuery = `
      SELECT
        p.id,
        p.title,
        p.brand,
        p.platform,
        p.product_link,
        pd.product_type,
        pd.image_url,
        pl.price AS latest_price
      FROM products p
      LEFT JOIN product_details pd ON pd.product_id = p.id
      LEFT JOIN LATERAL (
        SELECT price FROM product_price_logs
        WHERE product_id = p.id
        ORDER BY created_at DESC
        LIMIT 1
      ) pl ON true
      WHERE 1 = 1
        AND ($1::text IS NULL OR p.platform = $1)
        AND ($2::text IS NULL OR pd.product_type ILIKE '%' || $2 || '%')
        AND (
          $3::text IS NULL OR EXISTS (
            SELECT 1 FROM product_attributes pa
            WHERE pa.product_id = p.id
              AND pa.attribute_name = $3
              AND pa.attribute_value ILIKE '%' || $4 || '%'
          )
        )
        AND ($5::text IS NULL OR p.title ILIKE '%' || $5 || '%' OR p.brand ILIKE '%' || $5 || '%')
      ORDER BY 
        CASE WHEN $6 = 'price' AND $7 = 'asc' THEN pl.price END ASC,
        CASE WHEN $6 = 'price' AND $7 = 'desc' THEN pl.price END DESC,
        CASE WHEN $6 = 'created_at' AND $7 = 'asc' THEN p.created_at END ASC,
        CASE WHEN $6 = 'created_at' AND $7 = 'desc' THEN p.created_at END DESC,
        CASE WHEN $6 = 'title' AND $7 = 'asc' THEN p.title END ASC,
        CASE WHEN $6 = 'title' AND $7 = 'desc' THEN p.title END DESC
      LIMIT $8 OFFSET $9;
    `;

    const countResult = await pool.query(countQuery, [
      platform || null,
      product_type || null,
      attribute_name || null,
      attribute_value || null,
      search || null,
    ]);

    const dataResult = await pool.query(dataQuery, [
      platform || null,
      product_type || null,
      attribute_name || null,
      attribute_value || null,
      search || null,
      sort_by,
      sort_order,
      limit,
      offset,
    ]);

    res.json({
      success: true,
      total: parseInt(countResult.rows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
      products: dataResult.rows,
    });
  } catch (err) {
    console.error("🔴 Product fetch error:", err.message);
    res.status(500).json({
      success: false,
      message: "Ürünler alınamadı.",
      error: err.message,
    });
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
router.get("/product_price_logs", authenticateToken, async (req, res) => {
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
router.get("/product_details", authenticateToken, async (req, res) => {
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
router.get("/product_attributes", authenticateToken, async (req, res) => {
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
