// routes/finalProducts.js - Düzeltilmiş versiyon
import express from "express";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.use((req, res, next) => {
  console.log("istek geldi", req.method, req.originalUrl);
  next();
});
/**
 * @swagger
 * tags:
 *   name: Final Products
 *   description: Final product CRUD ve eşleştirme işlemleri
 */
/**
 * @swagger
 * /api/final_products/{id}/selectable-products:
 *   get:
 *     summary: Seçilebilir ürünleri filtreli olarak getir
 *     tags: [Final Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Final ürün ID
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *         description: Platform adı (opsiyonel)
 *       - in: query
 *         name: product_type
 *         schema:
 *           type: string
 *         description: Ürün tipi (opsiyonel)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Arama kelimesi (opsiyonel)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Sayfa başına sonuç sayısı
 *     responses:
 *       200:
 *         description: Başarılı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                 total:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *       500:
 *         description: Sunucu hatası
 */
// GET /api/final_products/:id/selectable-products - FIXED VERSION
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

    console.log("🔍 GET selectable-products called:", {
      finalProductId: id,
      filters: { platform, product_type, search },
      pagination: { page, limit },
    });

    try {
      const offset = (parseInt(page) - 1) * parseInt(limit);

      // Base WHERE conditions
      let whereConditions = ["1=1"];
      let params = [];
      let paramIndex = 1;

      // Platform filter
      if (platform) {
        whereConditions.push(`p.platform = $${paramIndex}`);
        params.push(platform);
        paramIndex++;
      }

      // Product type filter
      if (product_type) {
        whereConditions.push(`pd.product_type ILIKE $${paramIndex}`);
        params.push(`%${product_type}%`);
        paramIndex++;
      }

      // Search filter
      if (search) {
        whereConditions.push(
          `(p.title ILIKE $${paramIndex} OR p.brand ILIKE $${paramIndex})`
        );
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(" AND ");

      // 🎯 DÜZELTME: LEFT JOIN kullanarak NULL-safe logic
      const mainQuery = `
      FROM products p
      LEFT JOIN product_details pd ON pd.product_id = p.id
      LEFT JOIN final_product_matches fpm ON p.id = fpm.product_id
      WHERE ${whereClause}
      AND (
        -- Bu final product ile eşleşmiş ürünler
        fpm.final_product_id = $${paramIndex}
        OR 
        -- Hiç eşleşmemiş ürünler (fpm.product_id NULL ise)
        fpm.product_id IS NULL
      )
    `;

      // Count query
      const countQuery = `SELECT COUNT(*) ${mainQuery}`;
      const countResult = await pool.query(countQuery, [...params, id]);
      const total = parseInt(countResult.rows[0].count);

      console.log(`📊 Total matching products: ${total}`);

      // Data query
      const dataQuery = `
      SELECT 
        p.*,
        pd.product_type,
        pd.image_url,
        (
          SELECT price 
          FROM product_price_logs 
          WHERE product_id = p.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as latest_price,
        -- Bu ürün bu final product ile eşleşmiş mi?
        CASE 
          WHEN fpm.final_product_id = $${paramIndex} THEN true 
          ELSE false 
        END as is_currently_matched
      ${mainQuery}
      ORDER BY 
        -- Önce eşleşmiş olanlar, sonra eşleşmemişler
        is_currently_matched DESC,
        p.created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

      const dataResult = await pool.query(dataQuery, [
        ...params,
        id,
        limit,
        offset,
      ]);

      const currentlyMatched = dataResult.rows.filter(
        (p) => p.is_currently_matched
      ).length;
      const availableUnmatched = dataResult.rows.filter(
        (p) => !p.is_currently_matched
      ).length;

      console.log(`✅ Returning ${dataResult.rows.length} selectable products`);
      console.log(`📊 Currently matched: ${currentlyMatched}`);
      console.log(`📊 Available unmatched: ${availableUnmatched}`);

      // Debug: İlk 3 ürünü logla
      dataResult.rows.slice(0, 3).forEach((product) => {
        console.log(
          `🔍 Product ${product.id}: ${product.title} - matched: ${product.is_currently_matched}`
        );
      });

      res.json({
        success: true,
        products: dataResult.rows,
        total: total,
        page: parseInt(page),
        limit: parseInt(limit),
        debug: {
          currently_matched: currentlyMatched,
          available_unmatched: availableUnmatched,
          sql_params_used: [...params, id].length,
        },
      });
    } catch (err) {
      console.error("❌ Selectable products error:", err);
      res.status(500).json({
        success: false,
        message: "Seçilebilir ürünler getirilemedi",
        error: err.message,
        stack: err.stack,
      });
    }
  }
);
// 2. Mevcut eşleştirmeleri getir
// GET /api/final_products/:id/matches - Seçili ürün ID'lerini döndür
/**
 * @swagger
 * /api/final_products/{id}/matches:
 *   get:
 *     summary: Final ürünle eşleşmiş ürünlerin ID'lerini getir
 *     tags: [Final Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Final ürün ID
 *     responses:
 *       200:
 *         description: Eşleşmiş ürünler listelendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 matches:
 *                   type: array
 *                   items:
 *                     type: integer
 *                 total:
 *                   type: integer
 *                 message:
 *                   type: string
 *       500:
 *         description: Sunucu hatası
 */
router.get(
  "/final_products/:id/matches",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;

    console.log("🔍 GET /final_products/:id/matches called with ID:", id);

    try {
      // Sadece product ID'lerini al - basit sorgu
      const matchResult = await pool.query(
        "SELECT product_id FROM final_product_matches WHERE final_product_id = $1",
        [id]
      );

      console.log(
        `🔗 Found ${matchResult.rows.length} matches for final product ${id}`
      );

      // Sadece ID array'i döndür - modal bunları kullanacak
      const matchedProductIds = matchResult.rows.map((row) => row.product_id);

      console.log(`📋 Matched product IDs: [${matchedProductIds.join(", ")}]`);

      res.json({
        success: true,
        matches: matchedProductIds, // Sadece ID array'i
        total: matchedProductIds.length,
        message: `${matchedProductIds.length} ürün eşleşmiş`,
      });
    } catch (err) {
      console.error("❌ GET matches error:", err);

      res.status(500).json({
        success: false,
        message: "Eşleştirmeler getirilemedi",
        error: err.message,
        debug: {
          finalProductId: id,
          errorCode: err.code,
        },
      });
    }
  }
);
// 3. Eşleştirmeleri güncelle (PUT) - Modal için
/**
 * @swagger
 * /api/final_products/{id}/matches:
 *   put:
 *     summary: Final ürün eşleşmelerini güncelle (tamamen değiştir veya ekle)
 *     tags: [Final Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Final ürün ID
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
 *               replace_all:
 *                 type: boolean
 *                 description: Mevcut eşleşmeleri silip yenileri mi ekleyelim?
 *     responses:
 *       200:
 *         description: Eşleştirme güncellendi
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */
router.put(
  "/final_products/:id/matches",
  authenticateToken,
  async (req, res) => {
    const finalProductId = req.params.id;
    const { product_ids, replace_all } = req.body;

    console.log("🔄 PUT /final_products/:id/matches called:", {
      finalProductId,
      product_ids: product_ids?.length || 0,
      replace_all,
    });

    // Input validation
    if (!finalProductId || isNaN(parseInt(finalProductId))) {
      return res.status(400).json({
        success: false,
        message: "Geçersiz final product ID",
      });
    }

    if (!Array.isArray(product_ids)) {
      return res.status(400).json({
        success: false,
        message: "product_ids array olmalı",
      });
    }

    let client;
    try {
      // PostgreSQL connection
      client = await pool.connect();

      console.log("🔄 Starting transaction...");
      await client.query("BEGIN");

      if (replace_all) {
        // 1. Önce mevcut eşleştirmeleri sil
        console.log("🗑️ Deleting existing matches...");
        const deleteResult = await client.query(
          "DELETE FROM final_product_matches WHERE final_product_id = $1",
          [finalProductId]
        );
        console.log(`🗑️ Deleted ${deleteResult.rowCount} existing matches`);

        // 2. Yeni eşleştirmeleri tek tek ekle (created_at olmadan)
        let addedCount = 0;
        if (product_ids && product_ids.length > 0) {
          console.log("➕ Adding new matches...");

          for (const productId of product_ids) {
            try {
              // created_at kolonunu kaldırdık
              await client.query(
                "INSERT INTO final_product_matches (final_product_id, product_id) VALUES ($1, $2)",
                [finalProductId, productId]
              );
              addedCount++;
              console.log(`✅ Added match: ${finalProductId} -> ${productId}`);
            } catch (insertError) {
              // Duplicate key hatası varsa ignore et
              if (insertError.code === "23505") {
                // unique_violation
                console.log(
                  `⚠️ Duplicate match ignored: ${finalProductId} -> ${productId}`
                );
              } else {
                console.error(`❌ Insert error for ${productId}:`, insertError);
                throw insertError;
              }
            }
          }
        }

        console.log(
          `✅ Transaction completed: deleted ${deleteResult.rowCount}, added ${addedCount}`
        );
        await client.query("COMMIT");

        res.json({
          success: true,
          message: `Eşleştirmeler güncellendi: ${addedCount} ürün`,
          deleted_count: deleteResult.rowCount,
          added_count: addedCount,
          total: addedCount,
        });
      } else {
        // Backward compatibility - sadece ekleme
        let addedCount = 0;
        if (product_ids && product_ids.length > 0) {
          for (const productId of product_ids) {
            try {
              await client.query(
                "INSERT INTO final_product_matches (final_product_id, product_id) VALUES ($1, $2)",
                [finalProductId, productId]
              );
              addedCount++;
            } catch (insertError) {
              if (insertError.code !== "23505") {
                throw insertError;
              }
            }
          }
        }

        await client.query("COMMIT");

        res.json({
          success: true,
          message: `${addedCount} yeni eşleştirme eklendi`,
          added_count: addedCount,
        });
      }
    } catch (error) {
      // Rollback transaction
      if (client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error("❌ Rollback error:", rollbackError);
        }
      }

      console.error("❌ PUT matches error:", {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
      });

      // Detaylı hata mesajı
      let errorMessage = "Eşleştirme güncellenirken hata oluştu";

      if (error.code === "23503") {
        errorMessage = "Geçersiz product ID veya final product ID";
      } else if (error.code === "42P01") {
        errorMessage = "Tablo bulunamadı - Database yapısını kontrol edin";
      } else if (error.code === "42703") {
        errorMessage = "Kolon bulunamadı - Database şemasını kontrol edin";
      } else if (error.message) {
        errorMessage = error.message;
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        error_code: error.code,
        debug: {
          finalProductId,
          productIdsCount: product_ids?.length || 0,
          errorDetail: error.detail || "No additional details",
          hint: error.hint || "No hints available",
        },
      });
    } finally {
      // Connection'ı serbest bırak
      if (client) {
        client.release();
      }
    }
  }
);
// 4. Tekil eşleştirme silme
/**
 * @swagger
 * /api/final_products/{id}/matches/{product_id}:
 *   delete:
 *     summary: Tekil ürün eşleştirmesini sil
 *     tags: [Final Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Final ürün ID
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Eşleşmiş ürün ID
 *     responses:
 *       200:
 *         description: Eşleştirme silindi
 *       404:
 *         description: Eşleştirme bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.delete(
  "/final_products/:id/matches/:product_id",
  authenticateToken,
  async (req, res) => {
    const { id: finalProductId, product_id } = req.params;

    try {
      const result = await pool.query(
        "DELETE FROM final_product_matches WHERE final_product_id = $1 AND product_id = $2",
        [finalProductId, product_id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          success: false,
          message: "Eşleştirme bulunamadı",
        });
      }

      res.json({
        success: true,
        message: "Eşleştirme başarıyla silindi",
      });
    } catch (error) {
      console.error("❌ Delete match error:", error);
      res.status(500).json({
        success: false,
        message: "Eşleştirme silinirken hata oluştu",
        error: error.message,
      });
    }
  }
);
// 5. Eski POST endpoint (backward compatibility)
/**
 * @swagger
 * /api/final_products:
 *   post:
 *     summary: Yeni final ürün oluştur
 *     tags: [Final Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               category_id:
 *                 type: integer
 *               sales_channel_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               tag_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               price:
 *                 type: number
 *               campaign_price:
 *                 type: number
 *               ikas_product_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ürün başarıyla eklendi
 *       500:
 *         description: Sunucu hatası
 */

router.post(
  "/final_products/:id/matches",
  authenticateToken,
  async (req, res) => {
    const { id } = req.params;
    const { product_ids } = req.body;

    try {
      if (!product_ids || product_ids.length === 0) {
        return res.json({
          success: true,
          message: "Eşleşme eklenmedi.",
          added_count: 0,
        });
      }

      let addedCount = 0;
      for (const productId of product_ids) {
        try {
          await pool.query(
            "INSERT INTO final_product_matches (final_product_id, product_id, created_at) VALUES ($1, $2, NOW())",
            [id, productId]
          );
          addedCount++;
        } catch (insertErr) {
          // Duplicate ignore
          if (insertErr.code !== "23505") {
            throw insertErr;
          }
        }
      }

      res.json({
        success: true,
        message: `${addedCount} yeni eşleştirme eklendi`,
        added_count: addedCount,
      });
    } catch (err) {
      console.error("❌ POST matches error:", err);
      res.status(500).json({
        success: false,
        error: "Eşleştirme eklenemedi",
        detail: err.message,
      });
    }
  }
);
// 6. Final products listesi
/**
 * @swagger
 * /api/final_products:
 *   get:
 *     summary: Final ürünleri listele (sayfalama destekli)
 *     tags: [Final Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Sayfa numarası
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Sayfa başına sonuç sayısı
 *     responses:
 *       200:
 *         description: Ürün listesi
 *       500:
 *         description: Sunucu hatası
 */
router.get("/final_products", authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Toplam sayı
    const countResult = await pool.query("SELECT COUNT(*) FROM final_products");
    const total = parseInt(countResult.rows[0].count);

    // Ürünler + eşleştirme sayısı
    const productsResult = await pool.query(
      `
      SELECT 
        fp.*,
        COUNT(fpm.product_id) as matched_count
      FROM final_products fp
      LEFT JOIN final_product_matches fpm ON fp.id = fpm.final_product_id
      GROUP BY fp.id
      ORDER BY fp.created_at DESC
      LIMIT $1 OFFSET $2
      `,
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
    console.error("❌ Get final products error:", err);
    res.status(500).json({
      success: false,
      message: "Final ürünler alınamadı",
      error: err.message,
    });
  }
});
// 7. POST - Yeni final product ekleme
/**
 * @swagger
 * /api/final_products:
 *   post:
 *     summary: Yeni final ürün oluştur
 *     tags: [Final Products]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               category_id:
 *                 type: integer
 *               sales_channel_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               tag_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               price:
 *                 type: number
 *               campaign_price:
 *                 type: number
 *               ikas_product_id:
 *                 type: string
 *     responses:
 *       201:
 *         description: Ürün başarıyla eklendi
 *       500:
 *         description: Sunucu hatası
 */

router.post("/final_products", authenticateToken, async (req, res) => {
  const body = req.body || {};

  console.log("📥 POST yeni ürün isteği alındı. body:", body);

  // yardımcı dönüştürücüler
  const toNull = (v) => (v === "" || v === undefined ? null : v);
  const toNum = (v) =>
    v === "" || v === null || v === undefined ? null : Number(v);
  const toTextArray = (arr) => (Array.isArray(arr) ? arr.map(String) : null);

  try {
    const params = [
      toNull(body.name),
      toNull(body.short_description),
      toNull(body.description),
      toNull(body.image_url),
      toNull(body.brand),
      toNull(body.brand_id),
      toNull(body.category),
      toNull(body.category_id),
      toNum(body.weight),
      toNum(body.total_stock),
      toNum(body.max_quantity_per_cart),
      toNull(body.google_taxonomy_id),
      toNull(body.product_option_set_id),
      toNull(body.product_volume_discount_id),
      toNull(body.base_unit),
      toTextArray(body.sales_channel_ids),
      toTextArray(body.hidden_sales_channel_ids),
      toTextArray(body.tag_ids),
      toNull(body.ikas_product_id),
      toNum(body.price),
      toNum(body.campaign_price),
    ];

    console.log("📤 SQL Params:", params);

    const sql = `
      INSERT INTO final_products (
        name, short_description, description, image_url, brand, brand_id,
        category, category_id, weight, total_stock, max_quantity_per_cart,
        google_taxonomy_id, product_option_set_id, product_volume_discount_id,
        base_unit, sales_channel_ids, hidden_sales_channel_ids, tag_ids,
        ikas_product_id, price, campaign_price, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        COALESCE($16::text[],'{}'::text[]),
        COALESCE($17::text[],'{}'::text[]),
        COALESCE($18::text[],'{}'::text[]),
        $19, $20, $21, NOW(), NOW()
      )
      RETURNING *;
    `;

    const { rows } = await pool.query(sql, params);

    if (rows.length === 0) {
      return res.status(500).json({
        success: false,
        message: "Ürün eklenemedi",
      });
    }

    return res.status(201).json({
      success: true,
      data: rows[0],
      message: "Ürün başarıyla eklendi",
    });
  } catch (error) {
    console.error("❌ Final product create error:", error);
    return res.status(500).json({
      success: false,
      message: "Final ürün eklenemedi",
      error: error.message,
      details: {
        code: error.code,
        detail: error.detail,
        hint: error.hint,
      },
    });
  }
});
// 8. Tekil final product getir
/**
 * @swagger
 * /api/final_products/{id}:
 *   get:
 *     summary: Tekil final ürünü getir
 *     tags: [Final Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Final ürün ID
 *     responses:
 *       200:
 *         description: Ürün bulundu
 *       404:
 *         description: Ürün bulunamadı
 *       500:
 *         description: Sunucu hatası
 */
router.get("/final_products/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "SELECT * FROM final_products WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı.",
      });
    }

    res.json({
      success: true,
      product: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Get final product error:", err);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası.",
      error: err.message,
    });
  }
});

// 9. PUT - Final product güncelleme (Düzeltilmiş)
/**
 * @swagger
 * /api/final_products/{id}:
 *   put:
 *     summary: Final ürünü güncelle
 *     tags: [Final Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Final ürün ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               brand:
 *                 type: string
 *               price:
 *                 type: number
 *               sales_channel_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *               tag_ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Ürün güncellendi
 *       400:
 *         description: Geçersiz ID
 *       404:
 *         description: Ürün bulunamadı
 *       500:
 *         description: Sunucu hatası
 */

router.put("/final_products/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const body = req.body || {};

  console.log("📥 PUT isteği alındı. ID:", id, "body:", body);

  // ID validation
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz ürün ID",
    });
  }

  const toNull = (v) => (v === "" || v === undefined ? null : v);
  const toNum = (v) =>
    v === "" || v === null || v === undefined ? null : Number(v);
  const toTextArray = (arr) => (Array.isArray(arr) ? arr.map(String) : null);

  try {
    const params = [
      toNull(body.name),
      toNull(body.short_description),
      toNull(body.description),
      toNull(body.image_url),
      toNull(body.brand),
      toNull(body.brand_id),
      toNull(body.category),
      toNull(body.category_id),
      toNum(body.weight),
      toNum(body.total_stock),
      toNum(body.max_quantity_per_cart),
      toNull(body.google_taxonomy_id),
      toNull(body.product_option_set_id),
      toNull(body.product_volume_discount_id),
      toNull(body.base_unit),
      toTextArray(body.sales_channel_ids),
      toTextArray(body.hidden_sales_channel_ids),
      toTextArray(body.tag_ids),
      toNull(body.ikas_product_id),
      toNum(body.price),
      toNum(body.campaign_price),
      id,
    ];

    console.log("📤 SQL Params:", params);

    const sql = `
      UPDATE final_products SET
        name = $1,
        short_description = $2,
        description = $3,
        image_url = $4,
        brand = $5,
        brand_id = $6,
        category = $7,
        category_id = $8,
        weight = $9,
        total_stock = $10,
        max_quantity_per_cart = $11,
        google_taxonomy_id = $12,
        product_option_set_id = $13,
        product_volume_discount_id = $14,
        base_unit = $15,
        sales_channel_ids = COALESCE($16::text[],'{}'::text[]),
        hidden_sales_channel_ids = COALESCE($17::text[],'{}'::text[]),
        tag_ids = COALESCE($18::text[],'{}'::text[]),
        ikas_product_id = $19,
        price = $20,
        campaign_price = $21,
        updated_at = NOW()
      WHERE id = $22
      RETURNING *;
    `;

    const { rows } = await pool.query(sql, params);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Ürün bulunamadı.",
      });
    }

    return res.json({
      success: true,
      data: rows[0],
      message: "Ürün başarıyla güncellendi",
    });
  } catch (error) {
    console.error("❌ Final product update error:", error);
    return res.status(500).json({
      success: false,
      message: "Final ürün güncellenemedi",
      error: error.message,
      details: {
        code: error.code,
        detail: error.detail,
        hint: error.hint,
      },
    });
  }
});
// 10. DELETE - Final product silme (İKAS kontrolü ile)
/**
 * @swagger
 * /api/final_products/{id}:
 *   delete:
 *     summary: Final ürünü sil
 *     tags: [Final Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Final ürün ID
 *     responses:
 *       200:
 *         description: Ürün silindi
 *       403:
 *         description: İKAS entegre ürün silinemez
 *       404:
 *         description: Ürün bulunamadı
 *       500:
 *         description: Silme işlemi başarısız
 */

router.delete("/final_products/:id", authenticateToken, async (req, res) => {
  const { id } = req.params;

  console.log("🗑️ DELETE isteği alındı. ID:", id);

  // ID validation
  if (!id || isNaN(parseInt(id))) {
    return res.status(400).json({
      success: false,
      message: "Geçersiz ürün ID",
    });
  }

  let client;
  try {
    // Transaction başlat
    client = await pool.connect();
    await client.query("BEGIN");

    // 1. Önce ürünün var olup olmadığını ve İKAS durumunu kontrol et
    const checkResult = await client.query(
      "SELECT id, name, ikas_product_id FROM final_products WHERE id = $1",
      [id]
    );

    if (checkResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Silinecek ürün bulunamadı",
      });
    }

    const product = checkResult.rows[0];
    const { name: productName, ikas_product_id } = product;

    // 2. İKAS entegrasyonu kontrolü
    if (ikas_product_id && ikas_product_id.trim() !== "") {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "Bu ürün İKAS ile entegre edilmiştir ve silinemez",
        error_type: "IKAS_INTEGRATED",
        product_name: productName,
        ikas_product_id: ikas_product_id,
        details: {
          reason: "İKAS entegre ürünler güvenlik nedeniyle silinemez",
          suggestion: "Ürünü deaktif etmeyi düşünün",
        },
      });
    }

    // 3. İlişkili eşleştirmeleri sil (final_product_matches)
    const deleteMatchesResult = await client.query(
      "DELETE FROM final_product_matches WHERE final_product_id = $1",
      [id]
    );

    console.log(`🔗 ${deleteMatchesResult.rowCount} adet eşleştirme silindi`);

    // 4. İlişkili tag bağlantılarını sil (final_product_tags - eğer varsa)
    try {
      const deleteTagsResult = await client.query(
        "DELETE FROM final_product_tags WHERE final_product_id = $1",
        [id]
      );
      console.log(
        `🏷️ ${deleteTagsResult.rowCount} adet tag bağlantısı silindi`
      );
    } catch (tagError) {
      // final_product_tags tablosu yoksa ignore et
      if (tagError.code !== "42P01") {
        // table does not exist
        throw tagError;
      }
      console.log("ℹ️ final_product_tags tablosu bulunamadı, atlanıyor");
    }

    // 5. Final olarak ürünü sil
    const deleteProductResult = await client.query(
      "DELETE FROM final_products WHERE id = $1 RETURNING *",
      [id]
    );

    if (deleteProductResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(500).json({
        success: false,
        message: "Ürün silinemedi",
      });
    }

    // Transaction commit
    await client.query("COMMIT");

    console.log(`✅ Ürün başarıyla silindi: ${productName}`);

    res.json({
      success: true,
      message: `"${productName}" başarıyla silindi`,
      deleted_product: deleteProductResult.rows[0],
      statistics: {
        deleted_matches: deleteMatchesResult.rowCount,
        product_name: productName,
        was_ikas_integrated: false,
      },
    });
  } catch (error) {
    // Rollback transaction
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("❌ Rollback error:", rollbackError);
      }
    }

    console.error("❌ Final product delete error:", error);

    // Detaylı hata mesajı
    let errorMessage = "Ürün silinirken hata oluştu";

    if (error.code === "23503") {
      errorMessage = "Bu ürün başka kayıtlarla ilişkili olduğu için silinemez";
    } else if (error.code === "42P01") {
      errorMessage = "Tablo bulunamadı - Database yapısını kontrol edin";
    } else if (error.message) {
      errorMessage = error.message;
    }

    res.status(500).json({
      success: false,
      message: errorMessage,
      error_code: error.code,
      debug: {
        productId: id,
        errorDetail: error.detail || "No additional details",
        hint: error.hint || "No hints available",
      },
    });
  } finally {
    // Connection'ı serbest bırak
    if (client) {
      client.release();
    }
  }
});
// 8. Price logs endpoint
/**
 * @swagger
 * /api/product_price_logs/{product_id}:
 *   get:
 *     summary: Ürüne ait fiyat geçmişini getir
 *     tags: [Final Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: product_id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ürün ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Kaç satır getirilsin (varsayılan: 100)
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *         description: Sıralama yönü
 *     responses:
 *       200:
 *         description: Fiyat logları başarıyla getirildi
 *       400:
 *         description: Geçersiz parametre
 *       500:
 *         description: Sunucu hatası
 */

router.get(
  "/product_price_logs/:product_id",
  authenticateToken,
  async (req, res) => {
    try {
      const { product_id } = req.params;
      const { limit = 100, order = "DESC" } = req.query;

      if (!product_id) {
        return res.status(400).json({
          success: false,
          error: "product_id parametresi zorunlu",
        });
      }

      const orderDirection = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

      const result = await pool.query(
        `
        SELECT * FROM product_price_logs 
        WHERE product_id = $1
        ORDER BY created_at ${orderDirection}
        LIMIT $2
        `,
        [parseInt(product_id), parseInt(limit)]
      );

      res.json({
        success: true,
        logs: result.rows,
        total: result.rows.length,
      });
    } catch (err) {
      console.error("❌ Get price logs error:", err);
      res.status(500).json({
        success: false,
        error: "Veritabanı hatası",
        detail: err.message,
      });
    }
  }
);
// Debug endpoint - hangi ürünlerin hangi final product'larla eşleştiğini göster
/**
 * @swagger
 * /api/debug/all-matches:
 *   get:
 *     summary: Tüm eşleşmeleri detaylı getir (debug amaçlı)
 *     tags: [Debug]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Tüm eşleşmeler döndürüldü
 *       500:
 *         description: Sunucu hatası
 */

router.get("/debug/all-matches", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        fpm.final_product_id,
        fp.name as final_product_name,
        fpm.product_id,
        p.title as product_title,
        p.platform
      FROM final_product_matches fpm
      JOIN final_products fp ON fpm.final_product_id = fp.id
      JOIN products p ON fpm.product_id = p.id
      ORDER BY fpm.final_product_id, fpm.product_id
    `);

    res.json({
      success: true,
      all_matches: result.rows,
      total: result.rows.length,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
});

export default router;
