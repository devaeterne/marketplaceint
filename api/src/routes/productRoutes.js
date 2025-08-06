// src/routes/productRoutes.js
import express from "express";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// POST /api/categories
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
// Edit Final Products
// GET /api/final_products/:id
router.get("/final_products/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM final_products WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Ürün bulunamadı." });
    }

    return res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error("Final ürün getirme hatası:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası." });
  }
});
// PUT /api/final_products/:id
router.put("/final_products/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const {
    name,
    short_description,
    description,
    image_url,
    image_file,
    brand,
    brand_id,
    category,
    category_id,
    weight,
    total_stock,
    max_quantity_per_cart,
    google_taxonomy_id,
    product_option_set_id,
    product_volume_discount_id,
    base_unit,
    sales_channel_ids,
    hidden_sales_channel_ids,
    tag_ids,
    ikas_product_id,
    price,
    campaign_price,
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE final_products SET
        name = $1,
        short_description = $2,
        description = $3,
        image_url = $4,
        image_file = $5,
        brand = $6,
        brand_id = $7,
        category = $8,
        category_id = $9,
        weight = $10,
        total_stock = $11,
        max_quantity_per_cart = $12,
        google_taxonomy_id = $13,
        product_option_set_id = $14,
        product_volume_discount_id = $15,
        base_unit = $16,
        sales_channel_ids = $17,
        hidden_sales_channel_ids = $18,
        tag_ids = $19,
        ikas_product_id = $20,
        price = $21,
        campaign_price = $22
      WHERE id = $23 RETURNING *`,
      [
        name,
        short_description,
        description,
        image_url,
        image_file,
        brand,
        brand_id,
        category,
        category_id,
        weight,
        total_stock,
        max_quantity_per_cart,
        google_taxonomy_id,
        product_option_set_id,
        product_volume_discount_id,
        base_unit,
        sales_channel_ids,
        hidden_sales_channel_ids,
        tag_ids,
        ikas_product_id,
        price,
        campaign_price,
        id,
      ]
    );

    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    console.error("Final ürün güncelleme hatası:", err);
    res.status(500).json({ success: false, message: "Sunucu hatası." });
  }
});

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
 * /api/final_products:
 *   get:
 *     summary: Tüm final ürünleri getirir
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Final ürün listesi
 */
router.get("/final_products", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Toplam sayıyı al
    const countResult = await pool.query("SELECT COUNT(*) FROM final_products");
    const total = parseInt(countResult.rows[0].count);

    // Ürünleri al ve eşleşme sayılarını hesapla
    const productsResult = await pool.query(
      `SELECT 
        fp.*,
        COUNT(fpm.product_id) as matched_count
      FROM final_products fp
      LEFT JOIN final_product_matches fpm ON fp.id = fpm.final_product_id
      GROUP BY fp.id
      ORDER BY fp.created_at DESC
      LIMIT $1 OFFSET $2`,
      [parseInt(limit), offset]
    );

    res.json({
      success: true,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      products: productsResult.rows,
    });
  } catch (err) {
    console.error("Final ürünler alınamadı:", err);
    res.status(500).json({
      success: false,
      message: "Final ürünler alınamadı",
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
 * /api/product_price_logs/{product_id}:
 *   get:
 *     summary: Belirli bir ürüne ait fiyat kayıtlarını getirir
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ürün ID'si
 *     responses:
 *       200:
 *         description: Fiyat geçmişi listesi
 *       400:
 *         description: Geçersiz product_id
 */
router.get(
  "/product_price_logs/:product_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { product_id } = req.params;

      if (!product_id) {
        return res
          .status(400)
          .json({ error: "product_id parametresi zorunlu" });
      }

      const result = await pool.query(
        `
      SELECT * FROM product_price_logs 
      WHERE product_id = $1
      ORDER BY created_at DESC
      `,
        [parseInt(product_id)]
      );

      res.json(result.rows);
    } catch (err) {
      console.error("❌ Fiyat logları alınamadı:", err);
      res.status(500).json({ error: "Veritabanı hatası", detail: err.message });
    }
  }
);

/**
 * @swagger
 * /api/final_products/{id}/matches:
 *   get:
 *     summary: Final ürüne eşleşmiş ürünleri getirir
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Eşleşmiş ürün listesi
 */
router.get(
  "/final_products/:id/matches",
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
      FROM final_product_matches m
      JOIN products p ON m.product_id = p.id
      LEFT JOIN product_details pd ON pd.product_id = p.id
      LEFT JOIN LATERAL (
        SELECT price FROM product_price_logs
        WHERE product_id = p.id
        ORDER BY created_at DESC
        LIMIT 1
      ) pl ON true
      WHERE m.final_product_id = $1
    `,
        [id]
      );

      res.json(result.rows);
    } catch (err) {
      res
        .status(500)
        .json({ error: "Eşleşmiş ürünler getirilemedi", detail: err.message });
    }
  }
);

/**
 * @swagger
 * /api/final_products/{id}/unmatched-products:
 *   get:
 *     summary: Final ürüne henüz eşleşmemiş ürünleri getirir
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
 * /api/final_products:
 *   post:
 *     summary: Yeni bir final ürün ekler
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               short_description:
 *                 type: string
 *               description:
 *                 type: string
 *               image_url:
 *                 type: string
 *               image_file:
 *                 type: string
 *               brand:
 *                 type: string
 *               brand_id:
 *                 type: string
 *               category:
 *                 type: string
 *               category_id:
 *                 type: string
 *               weight:
 *                 type: number
 *               total_stock:
 *                 type: number
 *               max_quantity_per_cart:
 *                 type: integer
 *               google_taxonomy_id:
 *                 type: string
 *               product_option_set_id:
 *                 type: string
 *               product_volume_discount_id:
 *                 type: string
 *               base_unit:
 *                 type: string
 *               sales_channel_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               hidden_sales_channel_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               tag_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               ikas_product_id:
 *                 type: string
 *               price:
 *                 type: number
 *               campaign_price:
 *                 type: number
 *     responses:
 *       201:
 *         description: Final ürün başarıyla oluşturuldu
 */
router.post("/final_products", authenticateToken, async (req, res) => {
  try {
    const {
      name,
      short_description,
      description,
      image_url,
      image_file,
      brand,
      brand_id,
      category,
      category_id,
      weight,
      total_stock,
      max_quantity_per_cart,
      google_taxonomy_id,
      product_option_set_id,
      product_volume_discount_id,
      base_unit,
      sales_channel_ids,
      hidden_sales_channel_ids,
      tag_ids,
      ikas_product_id,
      price,
      campaign_price,
    } = req.body;

    const result = await pool.query(
      `
      INSERT INTO final_products (
        name, short_description, description,
        image_url, image_file,
        brand, brand_id,
        category, category_id,
        weight, total_stock, max_quantity_per_cart,
        google_taxonomy_id, product_option_set_id,
        product_volume_discount_id, base_unit,
        sales_channel_ids, hidden_sales_channel_ids, tag_ids,
        ikas_product_id, price, campaign_price
      ) VALUES (
        $1, $2, $3,
        $4, $5,
        $6, $7,
        $8, $9,
        $10, $11, $12,
        $13, $14,
        $15, $16,
        $17, $18, $19,
        $20, $21, $22
      )
      RETURNING *;
      `,
      [
        name,
        short_description,
        description,
        image_url,
        image_file,
        brand,
        brand_id,
        category,
        category_id,
        weight,
        total_stock,
        max_quantity_per_cart,
        google_taxonomy_id,
        product_option_set_id,
        product_volume_discount_id,
        base_unit,
        sales_channel_ids,
        hidden_sales_channel_ids,
        tag_ids,
        ikas_product_id,
        price,
        campaign_price,
      ]
    );

    res.json({
      success: true,
      product: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Final ürün eklenemedi:", err.message);
    res.status(500).json({
      success: false,
      message: "Final ürün eklenirken hata oluştu.",
      error: err.message,
    });
  }
});

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
 * /api/final_products/{id}/match/{product_id}:
 *   delete:
 *     summary: Final ürün eşleşmesini kaldırır
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Eşleşme başarıyla kaldırıldı
 */
router.delete(
  "/final_products/:id/match/:product_id",
  authenticateToken,
  async (req, res) => {
    const { id, product_id } = req.params;

    try {
      await pool.query(
        "DELETE FROM final_product_matches WHERE final_product_id = $1 AND product_id = $2",
        [id, product_id]
      );
      res.json({ success: true, message: "Eşleşme kaldırıldı." });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

/**
 * @swagger
 * /api/final_products/{id}/matches:
 *   post:
 *     summary: Final ürüne yeni eşleşmeler ekler
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               product_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       200:
 *         description: Eşleşmeler başarıyla eklendi
 */
router.post(
  "/final_products/:id/matches",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { product_ids } = req.body;

    try {
      if (!product_ids || product_ids.length === 0) {
        return res.json({ success: true, message: "Eşleşme eklenmedi." });
      }

      const values = product_ids.map((pid) => `(${id}, ${pid})`).join(",");
      await pool.query(
        `INSERT INTO final_product_matches (final_product_id, product_id)
       VALUES ${values}
       ON CONFLICT DO NOTHING`
      );
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
);

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

router.get(
  "/final_products/:id/selectable-products",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const {
      platform = "",
      product_type = "",
      search = "",
      page = 1,
      limit = 10,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    try {
      const baseParams = [id, platform, product_type, search];

      const countQuery = `
        SELECT COUNT(*) FROM products p
        LEFT JOIN product_details pd ON pd.product_id = p.id
        WHERE p.id NOT IN (
          SELECT product_id FROM final_product_matches
          WHERE final_product_id != $1
        )
        AND ($2 = '' OR p.platform = $2)
        AND ($3 = '' OR pd.product_type ILIKE '%' || $3 || '%')
        AND ($4 = '' OR p.title ILIKE '%' || $4 || '%' OR p.brand ILIKE '%' || $4 || '%')
      `;

      const dataQuery = `
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
          SELECT product_id FROM final_product_matches
          WHERE final_product_id != $1
        )
        AND ($2 = '' OR p.platform = $2)
        AND ($3 = '' OR pd.product_type ILIKE '%' || $3 || '%')
        AND ($4 = '' OR p.title ILIKE '%' || $4 || '%' OR p.brand ILIKE '%' || $4 || '%')
        ORDER BY p.created_at DESC
        LIMIT $5 OFFSET $6
      `;

      const countResult = await pool.query(countQuery, baseParams);
      const dataResult = await pool.query(dataQuery, [
        ...baseParams,
        limit,
        offset,
      ]);

      res.json({
        success: true,
        total: parseInt(countResult.rows[0].count),
        products: dataResult.rows,
      });
    } catch (err) {
      console.error("❌ Seçilebilir ürünler alınamadı:", err.message);
      res.status(500).json({
        error: "Seçilebilir ürünler getirilemedi",
        detail: err.message,
      });
    }
  }
);
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
