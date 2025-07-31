// src/routes/api.js
import express from "express";
import pool from "../../db.js";

const router = express.Router();

// product-details endpoint
router.get("/product-details/:productId", async (req, res) => {
  const productId = req.params.productId;
  try {
    const { rows } = await pool.query(
      `SELECT product_id, description, store_name, shipping_cost, shipping_info, rating, created_at, updated_at
       FROM product_details WHERE product_id = $1`,
      [productId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Ürün detayı bulunamadı." });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error("DB error:", error);
    res.status(500).json({ error: "Veritabanı hatası" });
  }
});

// Diğer API endpointlerini de buraya ekleyebilirsin.

export default router;
