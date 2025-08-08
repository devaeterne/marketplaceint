import express from "express";
import pool from "../db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// GET /api/reports/price-history/:productId
/**
 * @swagger
 * /api/reports/price-history/{productId}:
 *   get:
 *     summary: Bir ürüne ait fiyat geçmişini getirir
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Fiyat geçmişi başarıyla getirildi
 *       500:
 *         description: Sunucu hatası
 */
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
/**
 * @swagger
 * /api/reports/stock-status/{productId}:
 *   get:
 *     summary: Ürünün stok/takip durumunu getirir
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Stok durumu getirildi
 *       500:
 *         description: Sunucu hatası
 */
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

/**
 * @swagger
 * /api/reports/lowest-moment/{finalProductId}:
 *   get:
 *     summary: Eşleşmiş ürünler içinde en ucuz anları getirir
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: finalProductId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: En ucuz fiyat anı verileri
 *       500:
 *         description: Sunucu hatası
 */
router.get(
  "/lowest-moment/:finalProductId",
  authenticateToken,
  async (req, res) => {
    const { finalProductId } = req.params;

    try {
      const result = await pool.query(
        `
        WITH price_data AS (
          SELECT 
            p.id AS product_id,
            p.title AS product_name,
            p.platform,
            p.product_link AS url,
            min_logs.price AS lowest_price,
            current_logs.price AS current_price,
            min_logs.created_at AS lowest_date,
            -- NULL check'ler ekle
            COALESCE(current_logs.price, 0) - COALESCE(min_logs.price, 0) AS price_difference,
            -- Daha güvenli yüzde hesaplama
            CASE 
              WHEN min_logs.price IS NULL OR min_logs.price = 0 THEN 0
              WHEN current_logs.price IS NULL THEN 0
              ELSE ROUND(
                ((current_logs.price - min_logs.price) / min_logs.price) * 100,
                2
              )
            END AS price_difference_percentage,
            COALESCE(
              EXTRACT(DAY FROM NOW() - min_logs.created_at)::INTEGER,
              0
            ) AS days_ago
          FROM final_product_matches m
          JOIN products p ON m.product_id = p.id
          LEFT JOIN LATERAL (
            SELECT price, created_at
            FROM product_price_logs
            WHERE product_id = p.id
            AND price IS NOT NULL
            AND price > 0
            ORDER BY price ASC
            LIMIT 1
          ) min_logs ON true
          LEFT JOIN LATERAL (
            SELECT price
            FROM product_price_logs
            WHERE product_id = p.id
            AND price IS NOT NULL
            AND price > 0
            ORDER BY created_at DESC
            LIMIT 1
          ) current_logs ON true
          WHERE m.final_product_id = $1
          AND min_logs.price IS NOT NULL
          AND current_logs.price IS NOT NULL
        )
        SELECT 
          product_id,
          product_name,
          platform,
          url,
          lowest_price,
          current_price,
          lowest_date,
          price_difference,
          price_difference_percentage,
          days_ago
        FROM price_data
        ORDER BY lowest_price ASC
        `,
        [finalProductId]
      );

      console.log(
        "🔍 Lowest moment data:",
        result.rows.length,
        "products found"
      );

      // Gelen veriyi kontrol et
      result.rows.forEach((row, index) => {
        if (index < 3) {
          // İlk 3 ürünü logla
          console.log(`Product ${row.product_id}:`, {
            lowest: row.lowest_price,
            current: row.current_price,
            diff: row.price_difference,
            percentage: row.price_difference_percentage,
          });
        }
      });

      res.json({
        success: true,
        data: result.rows,
        debug: {
          total_products: result.rows.length,
          has_valid_percentages: result.rows.filter(
            (r) => r.price_difference_percentage !== null
          ).length,
        },
      });
    } catch (err) {
      console.error("🔴 En ucuz an hatası:", err);
      res.status(500).json({
        success: false,
        error: "Sunucu hatası",
        detail: err.message,
      });
    }
  }
);

// GET /api/reports/average-price/:finalProductId
/**
 * @swagger
 * /api/reports/average-price/{finalProductId}:
 *   get:
 *     summary: Platform bazlı ortalama fiyat istatistikleri
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: finalProductId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Ortalama fiyatlar getirildi
 *       500:
 *         description: Sunucu hatası
 */

router.get(
  "/average-price/:finalProductId",
  authenticateToken,
  async (req, res) => {
    const { finalProductId } = req.params;
    try {
      const result = await pool.query(
        `
        SELECT 
          p.platform,
          COUNT(*) AS product_count,
          AVG(COALESCE(l.campaign_price, l.price)) AS avg_price,
          MIN(COALESCE(l.campaign_price, l.price)) AS min_price,
          MAX(COALESCE(l.campaign_price, l.price)) AS max_price
        FROM final_product_matches m
        JOIN products p ON m.product_id = p.id
        JOIN product_price_logs l ON l.product_id = p.id
        WHERE m.final_product_id = $1
        GROUP BY p.platform
      `,
        [finalProductId]
      );

      res.json({
        success: true,
        data: result.rows.map((row) => ({
          platform: row.platform,
          avg_price: parseFloat(row.avg_price),
          product_count: parseInt(row.product_count),
          min_price: parseFloat(row.min_price),
          max_price: parseFloat(row.max_price),
          price_trend: "stable", // Placeholder
          trend_percentage: undefined, // Placeholder
        })),
      });
    } catch (err) {
      console.error("🔴 Ortalama fiyat hatası:", err);
      res.status(500).json({ success: false, error: "Sunucu hatası" });
    }
  }
);

// GET /api/tag-averages/:finalProductId
/**
 * @swagger
 * /api/reports/tag-averages/{finalProductId}:
 *   get:
 *     summary: Etiket bazlı fiyat istatistiklerini getir
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: finalProductId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Etiket bazlı fiyatlar
 *       500:
 *         description: Sunucu hatası
 */
router.get(
  "/tag-averages/:finalProductId",
  authenticateToken,
  async (req, res) => {
    const { finalProductId } = req.params;

    try {
      console.log(
        "🏷️ Tag averages requested for final product:",
        finalProductId
      );

      const result = await pool.query(
        `
      WITH final_product_tag_list AS (
    -- Bu final product'ın tag'leri
    SELECT DISTINCT
      pt.id as tag_id,
      pt.name as tag_name
    FROM product_tags pt
    INNER JOIN final_product_tags fpt ON pt.id = fpt.tag_id
    WHERE fpt.final_product_id = $1
),
tag_matched_products AS (
    -- Bu final product'ın eşleşmiş ürünleri
    SELECT 
      m.product_id,
      p.platform,
      p.title as product_name
    FROM final_product_matches m
    JOIN products p ON p.id = m.product_id
    WHERE m.final_product_id = $1
),
tag_price_data AS (
    -- Her tag için eşleşmiş ürünlerin fiyat verileri
    SELECT 
      fptl.tag_id,
      fptl.tag_name,
      tmp.product_id,
      tmp.platform,
      tmp.product_name,
      ppl.price
    FROM final_product_tag_list fptl
    CROSS JOIN tag_matched_products tmp
    JOIN LATERAL (
      SELECT price
      FROM product_price_logs
      WHERE product_id = tmp.product_id
      AND price > 0
      ORDER BY created_at DESC
      LIMIT 1
    ) ppl ON true
),
platform_stats AS (
    -- Her tag için platform istatistikleri
    SELECT 
      tag_id,
      platform,
      COUNT(*) as platform_count
    FROM tag_price_data
    GROUP BY tag_id, platform
),
most_common_platforms AS (
    -- Her tag için en yaygın platform
    SELECT DISTINCT ON (tag_id)
      tag_id,
      platform as most_common_platform
    FROM platform_stats
    ORDER BY tag_id, platform_count DESC
),
tag_statistics AS (
    -- Her tag için fiyat istatistikleri
    SELECT 
      tpd.tag_id,
      tpd.tag_name,
      AVG(tpd.price) as avg_price,
      MIN(tpd.price) as min_price,
      MAX(tpd.price) as max_price,
      VARIANCE(tpd.price) as price_variance,
      COUNT(DISTINCT tpd.product_id) as product_count
    FROM tag_price_data tpd
    GROUP BY tpd.tag_id, tpd.tag_name
)
-- Final result
SELECT 
  ts.tag_id,
  ts.tag_name,
  ROUND(COALESCE(ts.avg_price, 0)::numeric, 2) as avg_price,
  COALESCE(ts.product_count, 0) as product_count,
  ROUND(COALESCE(ts.min_price, 0)::numeric, 2) as min_price,
  ROUND(COALESCE(ts.max_price, 0)::numeric, 2) as max_price,
  ROUND(COALESCE(ts.price_variance, 0)::numeric, 2) as price_variance,
  mcp.most_common_platform
FROM tag_statistics ts
LEFT JOIN most_common_platforms mcp ON mcp.tag_id = ts.tag_id
WHERE ts.product_count > 0
ORDER BY ts.avg_price DESC;
    `,
        [finalProductId]
      );

      console.log(`✅ Found ${result.rows.length} tag groups`);

      // Debug: İlk birkaç tag'i logla
      result.rows.slice(0, 3).forEach((row) => {
        console.log(
          `🏷️ Tag "${row.tag_name}": ${row.product_count} products, avg ₺${row.avg_price}`
        );
      });

      res.json({
        success: true,
        data: result.rows,
        debug: {
          final_product_id: finalProductId,
          total_tags: result.rows.length,
          total_products: result.rows.reduce(
            (sum, row) => sum + parseInt(row.product_count),
            0
          ),
        },
      });
    } catch (err) {
      console.error("❌ Tag averages error:", err);
      res.status(500).json({
        success: false,
        message: "Etiket bazlı fiyat verileri alınamadı",
        error: err.message,
        debug: {
          final_product_id: finalProductId,
          sql_error: err.message,
        },
      });
    }
  }
);

// GET /api/reports/tag-price/:tagId
/**
 * @swagger
 * /api/reports/tag-price/{tagId}:
 *   get:
 *     summary: Belirli bir etikete ait final ürünlerin ortalama fiyatları
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: tagId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Etiket bazlı fiyat listesi
 *       500:
 *         description: Sunucu hatası
 */
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

// GET /api/lowest-price/:finalProductId
/**
 * @swagger
 * /api/reports/lowest-price/{finalProductId}:
 *   get:
 *     summary: Final ürün için en düşük fiyatlı teklifleri getir
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: finalProductId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: En düşük fiyatlı ürünler
 *       500:
 *         description: Sunucu hatası
 */
router.get(
  "/lowest-price/:finalProductId",
  authenticateToken,
  async (req, res) => {
    const { finalProductId } = req.params;

    try {
      const query = `
  SELECT 
    p.id AS product_id,
    p.title,
    p.platform,
    p.product_link,
    pr.price,
    pd.shipping_info,
    pr.campaign_price,
    pr.created_at
  FROM final_product_matches m
  JOIN products p ON m.product_id = p.id
  JOIN product_details pd ON p.id = pd.product_id
  LEFT JOIN LATERAL (
    SELECT price, campaign_price, created_at
    FROM product_price_logs
    WHERE product_id = p.id
    ORDER BY created_at DESC
    LIMIT 1
  ) pr ON true
  WHERE m.final_product_id = $1
  ORDER BY COALESCE(pr.campaign_price, pr.price) ASC
`;

      const result = await pool.query(query, [finalProductId]);
      res.json({ success: true, data: result.rows });
    } catch (err) {
      console.error("🔴 En ucuz fiyat listesi hatası:", err);
      res.status(500).json({ success: false, error: "Sunucu hatası" });
    }
  }
);

// GET /api/price-drops/:finalProductId - Düzeltilmiş versiyon
/**
 * @swagger
 * /api/reports/price-drops/{finalProductId}:
 *   get:
 *     summary: Fiyat düşüşü/kampanya analizini getir
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: finalProductId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: min_discount
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Minimum indirim yüzdesi
 *       - in: query
 *         name: days_back
 *         schema:
 *           type: integer
 *           default: 30
 *         description: Son kaç gün dikkate alınmalı
 *     responses:
 *       200:
 *         description: Fiyat düşüşleri bulundu
 *       400:
 *         description: Geçersiz ID
 *       500:
 *         description: Sunucu hatası
 */
router.get(
  "/price-drops/:finalProductId",
  authenticateToken,
  async (req, res) => {
    const { finalProductId } = req.params;
    const {
      min_discount = 1, // Minimum %5 indirim
      days_back = 30, // Son 30 gün
      // include_free parametresi kaldırıldı
    } = req.query;

    console.log("🔍 Price drops request:", {
      finalProductId,
      min_discount,
      days_back,
    });

    try {
      if (!finalProductId || isNaN(parseInt(finalProductId))) {
        return res.status(400).json({
          success: false,
          message: "Geçersiz final product ID",
        });
      }

      // Önce basit kontrol sorgusu
      const checkQuery = `
      SELECT COUNT(*) as count
      FROM final_product_matches m
      WHERE m.final_product_id = $1
    `;

      const checkResult = await pool.query(checkQuery, [finalProductId]);
      const matchCount = parseInt(checkResult.rows[0].count);

      console.log(
        `📊 Final product ${finalProductId} has ${matchCount} matches`
      );

      if (matchCount === 0) {
        return res.json({
          success: true,
          data: [],
          stats: {
            total_campaigns: 0,
            max_discount: 0,
            avg_discount: 0,
            by_type: {},
            by_confidence: {},
            by_platform: {},
          },
          message: "Bu final ürün için eşleşmiş ürün bulunamadı",
        });
      }

      // Düzeltilmiş mantık: Sadece gerçek kampanyaları tespit et
      const campaignQuery = `
      SELECT DISTINCT ON (p.id, l.price, l.campaign_price)
        p.platform,
        p.title as product_name,
        p.id as product_id,
        l.price as old_price,
        l.campaign_price as new_price,  -- Gerçek kampanya fiyatı
        (l.price - l.campaign_price) as discount_amount,
        ROUND(((l.price - l.campaign_price) / l.price) * 100, 2) as discount_percentage,
        l.created_at as detection_date,
        
        -- URL için product_link kullan
        COALESCE(p.product_link, '') as url,
        
        -- Campaign type belirleme (sadece gerçek kampanyalar)
        CASE 
          WHEN ((l.price - l.campaign_price) / l.price) >= 0.70 THEN 'flash_sale'
          WHEN ((l.price - l.campaign_price) / l.price) >= 0.40 THEN 'sudden_drop'
          WHEN ((l.price - l.campaign_price) / l.price) >= 0.10 THEN 'regular_discount'
          ELSE 'minor_discount'
        END as campaign_type,
        
        -- Confidence level
        CASE 
          WHEN ((l.price - l.campaign_price) / l.price) >= 0.50 THEN 'high'
          WHEN ((l.price - l.campaign_price) / l.price) >= 0.25 THEN 'medium'
          ELSE 'low'
        END as confidence_level,
        
        -- Duration estimate
        24 as duration_hours

      FROM final_product_matches m
      JOIN products p ON m.product_id = p.id
      JOIN product_price_logs l ON l.product_id = p.id
      WHERE m.final_product_id = $1
        AND l.price > 0 
        AND l.campaign_price IS NOT NULL     -- Kampanya fiyatı olmalı
        AND l.campaign_price > 0             -- Sıfır olmayan kampanya fiyatı
        AND l.campaign_price < l.price       -- Kampanya fiyatı normal fiyattan düşük
        AND l.created_at >= NOW() - INTERVAL '${days_back} days'
        AND ((l.price - l.campaign_price) / l.price) >= ($2 / 100.0)  -- Minimum indirim
      ORDER BY p.id, l.price, l.campaign_price, discount_percentage DESC, l.created_at DESC
      LIMIT 100
    `;

      console.log("🔍 Executing CORRECTED campaign query with params:", [
        finalProductId,
        min_discount,
      ]);
      console.log(
        "🔍 Logic: Only records with valid campaign_price (NOT NULL, > 0, < normal_price)"
      );

      const result = await pool.query(campaignQuery, [
        finalProductId,
        min_discount,
      ]);

      const campaigns = result.rows;

      console.log(`✅ Found ${campaigns.length} campaigns`);

      // İstatistikler hesapla
      const stats = {
        total_campaigns: campaigns.length,
        max_discount:
          campaigns.length > 0
            ? Math.max(
                ...campaigns.map((c) => parseFloat(c.discount_percentage) || 0)
              )
            : 0,
        avg_discount:
          campaigns.length > 0
            ? (
                campaigns.reduce(
                  (sum, c) => sum + (parseFloat(c.discount_percentage) || 0),
                  0
                ) / campaigns.length
              ).toFixed(2)
            : 0,

        by_type: {
          flash_sale: campaigns.filter((c) => c.campaign_type === "flash_sale")
            .length,
          sudden_drop: campaigns.filter(
            (c) => c.campaign_type === "sudden_drop"
          ).length,
          regular_discount: campaigns.filter(
            (c) => c.campaign_type === "regular_discount"
          ).length,
          minor_discount: campaigns.filter(
            (c) => c.campaign_type === "minor_discount"
          ).length,
        },

        by_confidence: {
          high: campaigns.filter((c) => c.confidence_level === "high").length,
          medium: campaigns.filter((c) => c.confidence_level === "medium")
            .length,
          low: campaigns.filter((c) => c.confidence_level === "low").length,
        },

        by_platform: {},
      };

      // Platform istatistikleri
      campaigns.forEach((campaign) => {
        const platform = campaign.platform || "unknown";
        stats.by_platform[platform] = (stats.by_platform[platform] || 0) + 1;
      });

      res.json({
        success: true,
        data: campaigns,
        stats: stats,
        query_params: {
          final_product_id: finalProductId,
          min_discount_percentage: min_discount,
          days_back: days_back,
        },
        message: `${campaigns.length} kampanya tespiti bulundu`,
      });
    } catch (error) {
      console.error("❌ Price drops error:", error);
      console.error("❌ Stack trace:", error.stack);

      res.status(500).json({
        success: false,
        message: "Kampanya tespiti yapılırken hata oluştu",
        error: error.message,
        debug: {
          finalProductId,
          query_params: { min_discount, days_back },
          error_code: error.code,
          error_detail: error.detail,
          error_hint: error.hint,
        },
      });
    }
  }
);

// Detailed debug endpoint
/**
 * @swagger
 * /api/reports/debug-campaigns/{finalProductId}:
 *   get:
 *     summary: Final ürün için kampanya analiz debug verisi
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: finalProductId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Kampanya debug verileri
 *       500:
 *         description: Sunucu hatası
 */
router.get(
  "/debug-campaigns/:finalProductId",
  authenticateToken,
  async (req, res) => {
    const { finalProductId } = req.params;

    try {
      console.log("🧪 Detailed debug for final product:", finalProductId);

      const debugResults = {};

      // 1. Final Product kontrolü
      const fpQuery = `
      SELECT fp.id, fp.name, COUNT(m.product_id) as matched_products
      FROM final_products fp
      LEFT JOIN final_product_matches m ON fp.id = m.final_product_id
      WHERE fp.id = $1
      GROUP BY fp.id, fp.name
    `;
      debugResults.final_product = await pool.query(fpQuery, [finalProductId]);

      // 2. Eşleşmiş ürünler
      const matchesQuery = `
      SELECT m.product_id, p.title, p.platform, p.product_link
      FROM final_product_matches m
      JOIN products p ON m.product_id = p.id
      WHERE m.final_product_id = $1
    `;
      debugResults.matched_products = await pool.query(matchesQuery, [
        finalProductId,
      ]);

      // 3. Price logs analizi
      const priceAnalysisQuery = `
      SELECT 
        p.id, p.title, p.platform,
        COUNT(l.id) as total_logs,
        COUNT(CASE WHEN l.campaign_price IS NOT NULL THEN 1 END) as with_campaign,
        COUNT(CASE WHEN l.campaign_price = 0 THEN 1 END) as zero_campaign,
        COUNT(CASE WHEN l.campaign_price IS NULL THEN 1 END) as null_campaign,
        MIN(l.price) as min_price, MAX(l.price) as max_price,
        MIN(l.created_at) as first_log, MAX(l.created_at) as last_log
      FROM final_product_matches m
      JOIN products p ON m.product_id = p.id
      LEFT JOIN product_price_logs l ON l.product_id = p.id
      WHERE m.final_product_id = $1
      GROUP BY p.id, p.title, p.platform
    `;
      debugResults.price_analysis = await pool.query(priceAnalysisQuery, [
        finalProductId,
      ]);

      // 4. Son 10 price log
      const recentLogsQuery = `
      SELECT 
        p.platform, p.title, l.price, l.campaign_price, l.created_at,
        CASE 
          WHEN l.campaign_price IS NULL THEN 'NULL'
          WHEN l.campaign_price = 0 THEN 'ZERO'
          ELSE 'HAS_VALUE'
        END as campaign_status,
        CASE WHEN l.campaign_price IS NULL OR l.campaign_price = 0 
             THEN ROUND(((l.price - 0) / l.price) * 100, 2)
             ELSE ROUND(((l.price - l.campaign_price) / l.price) * 100, 2)
        END as calculated_discount
      FROM final_product_matches m
      JOIN products p ON m.product_id = p.id
      JOIN product_price_logs l ON l.product_id = p.id
      WHERE m.final_product_id = $1
      ORDER BY l.created_at DESC
      LIMIT 10
    `;
      debugResults.recent_logs = await pool.query(recentLogsQuery, [
        finalProductId,
      ]);

      // 5. Koşul testleri
      const conditionTestQuery = `
      SELECT 
        p.platform, l.price, l.campaign_price,
        CASE WHEN l.price > 0 THEN 'PASS' ELSE 'FAIL' END as price_check,
        CASE WHEN l.created_at >= NOW() - INTERVAL '30 days' THEN 'PASS' ELSE 'FAIL' END as date_check,
        CASE 
          WHEN (l.campaign_price IS NOT NULL AND l.campaign_price > 0 AND ((l.price - l.campaign_price) / l.price) >= 0.05) THEN 'NORMAL_DISCOUNT'
          WHEN (l.campaign_price IS NULL OR l.campaign_price = 0) THEN 'FREE_PRODUCT'
          ELSE 'NO_MATCH'
        END as condition_result,
        l.created_at
      FROM final_product_matches m
      JOIN products p ON m.product_id = p.id
      JOIN product_price_logs l ON l.product_id = p.id
      WHERE m.final_product_id = $1
      ORDER BY l.created_at DESC
      LIMIT 5
    `;
      debugResults.condition_tests = await pool.query(conditionTestQuery, [
        finalProductId,
      ]);

      res.json({
        success: true,
        debug_results: debugResults,
        summary: {
          final_product_exists: debugResults.final_product.rows.length > 0,
          matched_products_count: debugResults.matched_products.rows.length,
          total_price_logs: debugResults.price_analysis.rows.reduce(
            (sum, row) => sum + parseInt(row.total_logs),
            0
          ),
          recent_logs_count: debugResults.recent_logs.rows.length,
          free_products_count: debugResults.recent_logs.rows.filter(
            (row) => row.campaign_status !== "HAS_VALUE"
          ).length,
        },
      });
    } catch (error) {
      console.error("❌ Debug error:", error);
      res.status(500).json({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    }
  }
);
export default router;
