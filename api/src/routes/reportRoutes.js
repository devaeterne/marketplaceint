import express from "express";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET /api/reports/price-history/:productId
router.get("/price-history/:productId", authenticateToken, async (req, res) => {
  const { productId } = req.params;
  try {
    const result = await pool.query(
      `SELECT price, campaign_price, created_at
       FROM product_price_logs
       WHERE product_id = $1
       ORDER BY created_at ASC`,
      [productId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("🔴 Fiyat geçmişi hatası:", err);
    res.status(500).json({ success: false, error: "Sunucu hatası" });
  }
});

// GET /api/reports/stock-status/:productId
router.get("/stock-status/:productId", authenticateToken, async (req, res) => {
  const { productId } = req.params;
  try {
    const result = await pool.query(
      `SELECT stock_status, created_at
       FROM product_price_logs
       WHERE product_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [productId]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    console.error("🔴 Stok durumu hatası:", err);
    res.status(500).json({ success: false, error: "Sunucu hatası" });
  }
});

// GET /api/reports/average-price/:finalProductId
router.get(
  "/average-price/:finalProductId",
  authenticateToken,
  async (req, res) => {
    const { finalProductId } = req.params;
    try {
      const result = await pool.query(
        `
      SELECT p.platform, AVG(l.campaign_price) AS avg_campaign_price, AVG(l.price) AS avg_price
      FROM final_product_matches m
      JOIN products p ON m.product_id = p.id
      JOIN product_price_logs l ON l.product_id = p.id
      WHERE m.final_product_id = $1
      GROUP BY p.platform
    `,
        [finalProductId]
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("🔴 Ortalama fiyat hatası:", err);
      res.status(500).json({ success: false, error: "Sunucu hatası" });
    }
  }
);

// GET /api/reports/tag-price/:tagId
router.get("/tag-price/:tagId", authenticateToken, async (req, res) => {
  const { tagId } = req.params;
  try {
    const result = await pool.query(
      `
      SELECT f.id, f.name, AVG(l.price) AS avg_price
      FROM final_products f
      JOIN unnest(f.tag_ids) AS tag ON tag = $1
      JOIN final_product_matches m ON m.final_product_id = f.id
      JOIN product_price_logs l ON l.product_id = m.product_id
      GROUP BY f.id
    `,
      [tagId]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("🔴 Tag bazlı fiyat hatası:", err);
    res.status(500).json({ success: false, error: "Sunucu hatası" });
  }
});

// GET /api/reports/lowest-price/:finalProductId
router.get(
  "/lowest-price/:finalProductId",
  authenticateToken,
  async (req, res) => {
    const { finalProductId } = req.params;
    try {
      const result = await pool.query(
        `
      SELECT p.platform, l.campaign_price, l.price, l.created_at
      FROM final_product_matches m
      JOIN products p ON m.product_id = p.id
      JOIN product_price_logs l ON l.product_id = p.id
      WHERE m.final_product_id = $1
      ORDER BY COALESCE(l.campaign_price, l.price) ASC
      LIMIT 1
    `,
        [finalProductId]
      );
      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error("🔴 En ucuz an hatası:", err);
      res.status(500).json({ success: false, error: "Sunucu hatası" });
    }
  }
);

// GET /api/reports/price-drops/:finalProductId
router.get(
  "/price-drops/:finalProductId",
  authenticateToken,
  async (req, res) => {
    const { finalProductId } = req.params;
    try {
      const result = await pool.query(
        `
      SELECT p.platform, l.price, l.campaign_price, l.created_at
      FROM final_product_matches m
      JOIN products p ON m.product_id = p.id
      JOIN product_price_logs l ON l.product_id = p.id
      WHERE m.final_product_id = $1
      AND l.price > 0 AND l.campaign_price > 0
      AND (l.price - l.campaign_price) / l.price >= 0.25
      ORDER BY l.created_at DESC
    `,
        [finalProductId]
      );
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("🔴 Kampanya algılama hatası:", err);
      res.status(500).json({ success: false, error: "Sunucu hatası" });
    }
  }
);
export default router;
