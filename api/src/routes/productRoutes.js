// src/routes/productRoutes.js
import express from "express";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         parent_id:
 *           type: integer
 *           nullable: true
 *     Tag:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         ikas_tag_id:
 *           type: string
 *         created_at:
 *           type: string
 *           format: date-time
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         title:
 *           type: string
 *         brand:
 *           type: string
 *         platform:
 *           type: string
 *         product_link:
 *           type: string
 *         product_type:
 *           type: string
 *         image_url:
 *           type: string
 *         rating:
 *           type: number
 *         latest_price:
 *           type: number
 *     FinalProduct:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         name:
 *           type: string
 *         brand:
 *           type: string
 *         price:
 *           type: number
 *         campaign_price:
 *           type: number
 *         category_id:
 *           type: integer
 *         sales_channel_ids:
 *           type: array
 *           items:
 *             type: string
 *         tag_ids:
 *           type: array
 *           items:
 *             type: string
 *         ikas_product_id:
 *           type: string
 *           nullable: true
 *     ProductPriceLog:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *         product_id:
 *           type: integer
 *         price:
 *           type: number
 *         created_at:
 *           type: string
 *           format: date-time
 *     ProductMatch:
 *       type: object
 *       properties:
 *         final_product_id:
 *           type: integer
 *         product_id:
 *           type: integer
 *     SearchTermStat:
 *       type: object
 *       properties:
 *         term:
 *           type: string
 *         hepsiburadaCount:
 *           type: integer
 *         trendyolCount:
 *           type: integer
 *         avansasCount:
 *           type: integer
 *         n11Count:
 *           type: integer
 */

// POST /api/categories
/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Yeni kategori oluştur
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               parent_id:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Kategori oluşturuldu
 *       400:
 *         description: Geçersiz giriş
 *       500:
 *         description: Sunucu hatası
 */
router.post("/categories", authenticateToken, async (req, res) => {
  const { name, parent_id } = req.body;

  if (!name || name.trim() === "") {
    return res.status(400).json({
      success: false,
      message: "Kategori adı zorunludur.",
    });
  }

  try {
    const existing = await pool.query(
      "SELECT * FROM standard_categories WHERE name = $1",
      [name]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Bu kategori zaten mevcut.",
      });
    }

    const result = await pool.query(
      "INSERT INTO standard_categories (name, parent_id) VALUES ($1, $2) RETURNING *",
      [name.trim(), parent_id || null]
    );

    return res.status(201).json({
      success: true,
      category: result.rows[0],
    });
  } catch (err) {
    console.error("Kategori eklenemedi:", err.message);
    res.status(500).json({ success: false, message: "Sunucu hatası." });
  }
});
// GET /api/categories
/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Tüm standart kategorileri getirir
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Kategori listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 categories:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 */

router.get("/categories", authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      "SELECT id, name, parent_id FROM public.standard_categories ORDER BY id ASC LIMIT $1 OFFSET $2",
      [limit, offset]
    );
    res.json({
      success: true,
      categories: result.rows,
      total: result.rows.length,
    });
  } catch (err) {
    console.error("Kategori sorgusu hatası:", err); // 🔍
    res.status(500).json({ error: "Veritabanı hatası", detail: err.message });
  }
});
/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Tüm etiketleri getirir
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Etiket listesi başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 tags:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       name:
 *                         type: string
 *                       ikas_tag_id:
 *                         type: string
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                 total:
 *                   type: integer
 *       500:
 *         description: Etiketler alınamadı
 */
router.get("/tags", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name, ikas_tag_id, created_at FROM product_tags ORDER BY id DESC"
    );

    return res.json({
      success: true,
      tags: result.rows,
      total: result.rowCount,
    });
  } catch (err) {
    console.error("Etiketler alınamadı:", err.message);
    return res
      .status(500)
      .json({ success: false, message: "Etiketler alınamadı" });
  }
});

/**
 * @swagger
 * /api/tags:
 *   post:
 *     summary: Yeni etiket oluştur
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *               ikas_tag_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Etiket oluşturuldu
 *       400:
 *         description: Geçersiz giriş
 *       500:
 *         description: Sunucu hatası
 */
router.post("/tags", authenticateToken, async (req, res) => {
  const { name, ikas_tag_id } = req.body;

  if (!name || name.trim() === "") {
    return res
      .status(400)
      .json({ success: false, message: "Etiket adı zorunludur." });
  }

  try {
    const existing = await pool.query(
      "SELECT * FROM product_tags WHERE name = $1",
      [name]
    );

    if (existing.rows.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Bu etiket zaten mevcut." });
    }

    const insertResult = await pool.query(
      "INSERT INTO product_tags (name, ikas_tag_id) VALUES ($1, $2) RETURNING *",
      [name, ikas_tag_id || null]
    );

    return res.status(201).json({ success: true, tag: insertResult.rows[0] });
  } catch (err) {
    console.error("Etiket eklenemedi:", err.message);
    return res.status(500).json({ success: false, message: "Sunucu hatası." });
  }
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Tüm ürünleri getirir
 *     tags: [Product]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Sayfa başına ürün sayısı
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Platform adı
 *       - in: query
 *         name: product_type
 *         schema:
 *           type: string
 *         description: Ürün tipi
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Arama terimi
 *     responses:
 *       200:
 *         description: Ürün listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
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
        pd.rating,
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
 *     tags: [Product]
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
 * /api/final_products/{id}/unmatched-products:
 *   get:
 *     summary: Final ürüne henüz eşleşmemiş ürünleri getirir
 *     tags: [Product]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Eşleşmemiş ürün listesi
 */
router.get(
  "/final_products/:id/unmatched-products",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        `
      SELECT p.*, 
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
      WHERE p.id NOT IN (
        SELECT product_id FROM final_product_matches WHERE final_product_id = $1
      )
    `,
        [id]
      );

      res.json(result.rows);
    } catch (err) {
      res.status(500).json({
        error: "Henüz eşleşmemiş ürünler getirilemedi",
        detail: err.message,
      });
    }
  }
);

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Tüm standart kategorileri getirir
 *     responses:
 *       200:
 *         description: Kategori listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                     description: Kategorinin adı
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: Kategorinin oluşturulma tarihi
 *                     example: "2023-10-01T12:00:00Z"
 */
router.get("/categories", authenticateToken, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM standard_categories ORDER BY name ASC"
  );
  res.json(result.rows);
});

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Tüm etiketleri getirir
 *     responses:
 *       200:
 *         description: Etiket listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   name:
 *                     type: string
 *                     description: Etiketin adı
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     description: Etiketin oluşturulma tarihi
 *                     example: "2023-10-01T12:00:00Z"
 */
router.get("/tags", authenticateToken, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM product_tags ORDER BY name ASC"
  );
  res.json(result.rows);
});

/**
 * @swagger
 * /api/product_details:
 *   get:
 *     summary: Tüm ürün detaylarını getirir
 *     tags: [Product]
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
 *     tags: [Product]
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

/**
 * @swagger
 * /api/search-terms-log:
 *   get:
 *     summary: Platform bazlı arama terimlerini getir
 *     tags: [Search Terms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Arama terimleri başarıyla alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       term:
 *                         type: string
 *                       hepsiburadaCount:
 *                         type: integer
 *                       trendyolCount:
 *                         type: integer
 *                       avansasCount:
 *                         type: integer
 *                       n11Count:
 *                         type: integer
 *       500:
 *         description: Sunucu hatası
 */

router.get("/search-terms-log", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        term,
        MAX(CASE WHEN platform = 'hepsiburada' THEN count ELSE 0 END) AS "hepsiburadaCount",
        MAX(CASE WHEN platform = 'trendyol' THEN count ELSE 0 END) AS "trendyolCount",
        MAX(CASE WHEN platform = 'avansas' THEN count ELSE 0 END) AS "avansasCount",
        MAX(CASE WHEN platform = 'n11' THEN count ELSE 0 END) AS "n11Count"
      FROM public.search_terms
      GROUP BY term
      ORDER BY term
    `);

    res.json({ success: true, data: result.rows });
  } catch (err) {
    console.error("🔴 Arama özet hatası:", err);
    res.status(500).json({ success: false, error: "Sunucu hatası" });
  }
});

export default router;
