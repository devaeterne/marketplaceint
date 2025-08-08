"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _db = _interopRequireDefault(require("../db.js"));

var _auth = require("../middleware/auth.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

var router = _express["default"].Router(); // GET /api/reports/price-history/:productId

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


router.get("/price-history/:productId", _auth.authenticateToken, function _callee(req, res) {
  var productId, result;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          productId = req.params.productId;
          _context.prev = 1;
          _context.next = 4;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT price, campaign_price, created_at\n       FROM product_price_logs\n       WHERE product_id = $1\n       ORDER BY created_at ASC", [productId]));

        case 4:
          result = _context.sent;
          res.json({
            success: true,
            data: result.rows
          });
          _context.next = 12;
          break;

        case 8:
          _context.prev = 8;
          _context.t0 = _context["catch"](1);
          console.error("🔴 Fiyat geçmişi hatası:", _context.t0);
          res.status(500).json({
            success: false,
            error: "Sunucu hatası"
          });

        case 12:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[1, 8]]);
}); // GET /api/reports/stock-status/:productId

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

router.get("/stock-status/:productId", _auth.authenticateToken, function _callee2(req, res) {
  var productId, result;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          productId = req.params.productId;
          _context2.prev = 1;
          _context2.next = 4;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT stock_status, created_at\n       FROM product_price_logs\n       WHERE product_id = $1\n       ORDER BY created_at DESC\n       LIMIT 1", [productId]));

        case 4:
          result = _context2.sent;
          res.json({
            success: true,
            data: result.rows[0]
          });
          _context2.next = 12;
          break;

        case 8:
          _context2.prev = 8;
          _context2.t0 = _context2["catch"](1);
          console.error("🔴 Stok durumu hatası:", _context2.t0);
          res.status(500).json({
            success: false,
            error: "Sunucu hatası"
          });

        case 12:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[1, 8]]);
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

router.get("/lowest-moment/:finalProductId", _auth.authenticateToken, function _callee3(req, res) {
  var finalProductId, result;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          finalProductId = req.params.finalProductId;
          _context3.prev = 1;
          _context3.next = 4;
          return regeneratorRuntime.awrap(_db["default"].query("\n        WITH price_data AS (\n          SELECT \n            p.id AS product_id,\n            p.title AS product_name,\n            p.platform,\n            p.product_link AS url,\n            min_logs.price AS lowest_price,\n            current_logs.price AS current_price,\n            min_logs.created_at AS lowest_date,\n            -- NULL check'ler ekle\n            COALESCE(current_logs.price, 0) - COALESCE(min_logs.price, 0) AS price_difference,\n            -- Daha g\xFCvenli y\xFCzde hesaplama\n            CASE \n              WHEN min_logs.price IS NULL OR min_logs.price = 0 THEN 0\n              WHEN current_logs.price IS NULL THEN 0\n              ELSE ROUND(\n                ((current_logs.price - min_logs.price) / min_logs.price) * 100,\n                2\n              )\n            END AS price_difference_percentage,\n            COALESCE(\n              EXTRACT(DAY FROM NOW() - min_logs.created_at)::INTEGER,\n              0\n            ) AS days_ago\n          FROM final_product_matches m\n          JOIN products p ON m.product_id = p.id\n          LEFT JOIN LATERAL (\n            SELECT price, created_at\n            FROM product_price_logs\n            WHERE product_id = p.id\n            AND price IS NOT NULL\n            AND price > 0\n            ORDER BY price ASC\n            LIMIT 1\n          ) min_logs ON true\n          LEFT JOIN LATERAL (\n            SELECT price\n            FROM product_price_logs\n            WHERE product_id = p.id\n            AND price IS NOT NULL\n            AND price > 0\n            ORDER BY created_at DESC\n            LIMIT 1\n          ) current_logs ON true\n          WHERE m.final_product_id = $1\n          AND min_logs.price IS NOT NULL\n          AND current_logs.price IS NOT NULL\n        )\n        SELECT \n          product_id,\n          product_name,\n          platform,\n          url,\n          lowest_price,\n          current_price,\n          lowest_date,\n          price_difference,\n          price_difference_percentage,\n          days_ago\n        FROM price_data\n        ORDER BY lowest_price ASC\n        ", [finalProductId]));

        case 4:
          result = _context3.sent;
          console.log("🔍 Lowest moment data:", result.rows.length, "products found"); // Gelen veriyi kontrol et

          result.rows.forEach(function (row, index) {
            if (index < 3) {
              // İlk 3 ürünü logla
              console.log("Product ".concat(row.product_id, ":"), {
                lowest: row.lowest_price,
                current: row.current_price,
                diff: row.price_difference,
                percentage: row.price_difference_percentage
              });
            }
          });
          res.json({
            success: true,
            data: result.rows,
            debug: {
              total_products: result.rows.length,
              has_valid_percentages: result.rows.filter(function (r) {
                return r.price_difference_percentage !== null;
              }).length
            }
          });
          _context3.next = 14;
          break;

        case 10:
          _context3.prev = 10;
          _context3.t0 = _context3["catch"](1);
          console.error("🔴 En ucuz an hatası:", _context3.t0);
          res.status(500).json({
            success: false,
            error: "Sunucu hatası",
            detail: _context3.t0.message
          });

        case 14:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[1, 10]]);
}); // GET /api/reports/average-price/:finalProductId

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

router.get("/average-price/:finalProductId", _auth.authenticateToken, function _callee4(req, res) {
  var finalProductId, result;
  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          finalProductId = req.params.finalProductId;
          _context4.prev = 1;
          _context4.next = 4;
          return regeneratorRuntime.awrap(_db["default"].query("\n        SELECT \n          p.platform,\n          COUNT(*) AS product_count,\n          AVG(COALESCE(l.campaign_price, l.price)) AS avg_price,\n          MIN(COALESCE(l.campaign_price, l.price)) AS min_price,\n          MAX(COALESCE(l.campaign_price, l.price)) AS max_price\n        FROM final_product_matches m\n        JOIN products p ON m.product_id = p.id\n        JOIN product_price_logs l ON l.product_id = p.id\n        WHERE m.final_product_id = $1\n        GROUP BY p.platform\n      ", [finalProductId]));

        case 4:
          result = _context4.sent;
          res.json({
            success: true,
            data: result.rows.map(function (row) {
              return {
                platform: row.platform,
                avg_price: parseFloat(row.avg_price),
                product_count: parseInt(row.product_count),
                min_price: parseFloat(row.min_price),
                max_price: parseFloat(row.max_price),
                price_trend: "stable",
                // Placeholder
                trend_percentage: undefined // Placeholder

              };
            })
          });
          _context4.next = 12;
          break;

        case 8:
          _context4.prev = 8;
          _context4.t0 = _context4["catch"](1);
          console.error("🔴 Ortalama fiyat hatası:", _context4.t0);
          res.status(500).json({
            success: false,
            error: "Sunucu hatası"
          });

        case 12:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[1, 8]]);
}); // GET /api/tag-averages/:finalProductId

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

router.get("/tag-averages/:finalProductId", _auth.authenticateToken, function _callee5(req, res) {
  var finalProductId, result;
  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          finalProductId = req.params.finalProductId;
          _context5.prev = 1;
          console.log("🏷️ Tag averages requested for final product:", finalProductId);
          _context5.next = 5;
          return regeneratorRuntime.awrap(_db["default"].query("\n      WITH final_product_tag_list AS (\n    -- Bu final product'\u0131n tag'leri\n    SELECT DISTINCT\n      pt.id as tag_id,\n      pt.name as tag_name\n    FROM product_tags pt\n    INNER JOIN final_product_tags fpt ON pt.id = fpt.tag_id\n    WHERE fpt.final_product_id = $1\n),\ntag_matched_products AS (\n    -- Bu final product'\u0131n e\u015Fle\u015Fmi\u015F \xFCr\xFCnleri\n    SELECT \n      m.product_id,\n      p.platform,\n      p.title as product_name\n    FROM final_product_matches m\n    JOIN products p ON p.id = m.product_id\n    WHERE m.final_product_id = $1\n),\ntag_price_data AS (\n    -- Her tag i\xE7in e\u015Fle\u015Fmi\u015F \xFCr\xFCnlerin fiyat verileri\n    SELECT \n      fptl.tag_id,\n      fptl.tag_name,\n      tmp.product_id,\n      tmp.platform,\n      tmp.product_name,\n      ppl.price\n    FROM final_product_tag_list fptl\n    CROSS JOIN tag_matched_products tmp\n    JOIN LATERAL (\n      SELECT price\n      FROM product_price_logs\n      WHERE product_id = tmp.product_id\n      AND price > 0\n      ORDER BY created_at DESC\n      LIMIT 1\n    ) ppl ON true\n),\nplatform_stats AS (\n    -- Her tag i\xE7in platform istatistikleri\n    SELECT \n      tag_id,\n      platform,\n      COUNT(*) as platform_count\n    FROM tag_price_data\n    GROUP BY tag_id, platform\n),\nmost_common_platforms AS (\n    -- Her tag i\xE7in en yayg\u0131n platform\n    SELECT DISTINCT ON (tag_id)\n      tag_id,\n      platform as most_common_platform\n    FROM platform_stats\n    ORDER BY tag_id, platform_count DESC\n),\ntag_statistics AS (\n    -- Her tag i\xE7in fiyat istatistikleri\n    SELECT \n      tpd.tag_id,\n      tpd.tag_name,\n      AVG(tpd.price) as avg_price,\n      MIN(tpd.price) as min_price,\n      MAX(tpd.price) as max_price,\n      VARIANCE(tpd.price) as price_variance,\n      COUNT(DISTINCT tpd.product_id) as product_count\n    FROM tag_price_data tpd\n    GROUP BY tpd.tag_id, tpd.tag_name\n)\n-- Final result\nSELECT \n  ts.tag_id,\n  ts.tag_name,\n  ROUND(COALESCE(ts.avg_price, 0)::numeric, 2) as avg_price,\n  COALESCE(ts.product_count, 0) as product_count,\n  ROUND(COALESCE(ts.min_price, 0)::numeric, 2) as min_price,\n  ROUND(COALESCE(ts.max_price, 0)::numeric, 2) as max_price,\n  ROUND(COALESCE(ts.price_variance, 0)::numeric, 2) as price_variance,\n  mcp.most_common_platform\nFROM tag_statistics ts\nLEFT JOIN most_common_platforms mcp ON mcp.tag_id = ts.tag_id\nWHERE ts.product_count > 0\nORDER BY ts.avg_price DESC;\n    ", [finalProductId]));

        case 5:
          result = _context5.sent;
          console.log("\u2705 Found ".concat(result.rows.length, " tag groups")); // Debug: İlk birkaç tag'i logla

          result.rows.slice(0, 3).forEach(function (row) {
            console.log("\uD83C\uDFF7\uFE0F Tag \"".concat(row.tag_name, "\": ").concat(row.product_count, " products, avg \u20BA").concat(row.avg_price));
          });
          res.json({
            success: true,
            data: result.rows,
            debug: {
              final_product_id: finalProductId,
              total_tags: result.rows.length,
              total_products: result.rows.reduce(function (sum, row) {
                return sum + parseInt(row.product_count);
              }, 0)
            }
          });
          _context5.next = 15;
          break;

        case 11:
          _context5.prev = 11;
          _context5.t0 = _context5["catch"](1);
          console.error("❌ Tag averages error:", _context5.t0);
          res.status(500).json({
            success: false,
            message: "Etiket bazlı fiyat verileri alınamadı",
            error: _context5.t0.message,
            debug: {
              final_product_id: finalProductId,
              sql_error: _context5.t0.message
            }
          });

        case 15:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[1, 11]]);
}); // GET /api/reports/tag-price/:tagId

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

router.get("/tag-price/:tagId", _auth.authenticateToken, function _callee6(req, res) {
  var tagId, result;
  return regeneratorRuntime.async(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          tagId = req.params.tagId;
          _context6.prev = 1;
          _context6.next = 4;
          return regeneratorRuntime.awrap(_db["default"].query("\n      SELECT f.id, f.name, AVG(l.price) AS avg_price\n      FROM final_products f\n      JOIN unnest(f.tag_ids) AS tag ON tag = $1\n      JOIN final_product_matches m ON m.final_product_id = f.id\n      JOIN product_price_logs l ON l.product_id = m.product_id\n      GROUP BY f.id\n    ", [tagId]));

        case 4:
          result = _context6.sent;
          res.json({
            success: true,
            data: result.rows
          });
          _context6.next = 12;
          break;

        case 8:
          _context6.prev = 8;
          _context6.t0 = _context6["catch"](1);
          console.error("🔴 Tag bazlı fiyat hatası:", _context6.t0);
          res.status(500).json({
            success: false,
            error: "Sunucu hatası"
          });

        case 12:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[1, 8]]);
}); // GET /api/lowest-price/:finalProductId

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

router.get("/lowest-price/:finalProductId", _auth.authenticateToken, function _callee7(req, res) {
  var finalProductId, query, result;
  return regeneratorRuntime.async(function _callee7$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          finalProductId = req.params.finalProductId;
          _context7.prev = 1;
          query = "\n  SELECT \n    p.id AS product_id,\n    p.title,\n    p.platform,\n    p.product_link,\n    pr.price,\n    pd.shipping_info,\n    pr.campaign_price,\n    pr.created_at\n  FROM final_product_matches m\n  JOIN products p ON m.product_id = p.id\n  JOIN product_details pd ON p.id = pd.product_id\n  LEFT JOIN LATERAL (\n    SELECT price, campaign_price, created_at\n    FROM product_price_logs\n    WHERE product_id = p.id\n    ORDER BY created_at DESC\n    LIMIT 1\n  ) pr ON true\n  WHERE m.final_product_id = $1\n  ORDER BY COALESCE(pr.campaign_price, pr.price) ASC\n";
          _context7.next = 5;
          return regeneratorRuntime.awrap(_db["default"].query(query, [finalProductId]));

        case 5:
          result = _context7.sent;
          res.json({
            success: true,
            data: result.rows
          });
          _context7.next = 13;
          break;

        case 9:
          _context7.prev = 9;
          _context7.t0 = _context7["catch"](1);
          console.error("🔴 En ucuz fiyat listesi hatası:", _context7.t0);
          res.status(500).json({
            success: false,
            error: "Sunucu hatası"
          });

        case 13:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[1, 9]]);
}); // GET /api/price-drops/:finalProductId - Düzeltilmiş versiyon

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

router.get("/price-drops/:finalProductId", _auth.authenticateToken, function _callee8(req, res) {
  var finalProductId, _req$query, _req$query$min_discou, min_discount, _req$query$days_back, days_back, checkQuery, checkResult, matchCount, campaignQuery, result, campaigns, stats;

  return regeneratorRuntime.async(function _callee8$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          finalProductId = req.params.finalProductId;
          _req$query = req.query, _req$query$min_discou = _req$query.min_discount, min_discount = _req$query$min_discou === void 0 ? 1 : _req$query$min_discou, _req$query$days_back = _req$query.days_back, days_back = _req$query$days_back === void 0 ? 30 : _req$query$days_back;
          console.log("🔍 Price drops request:", {
            finalProductId: finalProductId,
            min_discount: min_discount,
            days_back: days_back
          });
          _context8.prev = 3;

          if (!(!finalProductId || isNaN(parseInt(finalProductId)))) {
            _context8.next = 6;
            break;
          }

          return _context8.abrupt("return", res.status(400).json({
            success: false,
            message: "Geçersiz final product ID"
          }));

        case 6:
          // Önce basit kontrol sorgusu
          checkQuery = "\n      SELECT COUNT(*) as count\n      FROM final_product_matches m\n      WHERE m.final_product_id = $1\n    ";
          _context8.next = 9;
          return regeneratorRuntime.awrap(_db["default"].query(checkQuery, [finalProductId]));

        case 9:
          checkResult = _context8.sent;
          matchCount = parseInt(checkResult.rows[0].count);
          console.log("\uD83D\uDCCA Final product ".concat(finalProductId, " has ").concat(matchCount, " matches"));

          if (!(matchCount === 0)) {
            _context8.next = 14;
            break;
          }

          return _context8.abrupt("return", res.json({
            success: true,
            data: [],
            stats: {
              total_campaigns: 0,
              max_discount: 0,
              avg_discount: 0,
              by_type: {},
              by_confidence: {},
              by_platform: {}
            },
            message: "Bu final ürün için eşleşmiş ürün bulunamadı"
          }));

        case 14:
          // Düzeltilmiş mantık: Sadece gerçek kampanyaları tespit et
          campaignQuery = "\n      SELECT DISTINCT ON (p.id, l.price, l.campaign_price)\n        p.platform,\n        p.title as product_name,\n        p.id as product_id,\n        l.price as old_price,\n        l.campaign_price as new_price,  -- Ger\xE7ek kampanya fiyat\u0131\n        (l.price - l.campaign_price) as discount_amount,\n        ROUND(((l.price - l.campaign_price) / l.price) * 100, 2) as discount_percentage,\n        l.created_at as detection_date,\n        \n        -- URL i\xE7in product_link kullan\n        COALESCE(p.product_link, '') as url,\n        \n        -- Campaign type belirleme (sadece ger\xE7ek kampanyalar)\n        CASE \n          WHEN ((l.price - l.campaign_price) / l.price) >= 0.70 THEN 'flash_sale'\n          WHEN ((l.price - l.campaign_price) / l.price) >= 0.40 THEN 'sudden_drop'\n          WHEN ((l.price - l.campaign_price) / l.price) >= 0.10 THEN 'regular_discount'\n          ELSE 'minor_discount'\n        END as campaign_type,\n        \n        -- Confidence level\n        CASE \n          WHEN ((l.price - l.campaign_price) / l.price) >= 0.50 THEN 'high'\n          WHEN ((l.price - l.campaign_price) / l.price) >= 0.25 THEN 'medium'\n          ELSE 'low'\n        END as confidence_level,\n        \n        -- Duration estimate\n        24 as duration_hours\n\n      FROM final_product_matches m\n      JOIN products p ON m.product_id = p.id\n      JOIN product_price_logs l ON l.product_id = p.id\n      WHERE m.final_product_id = $1\n        AND l.price > 0 \n        AND l.campaign_price IS NOT NULL     -- Kampanya fiyat\u0131 olmal\u0131\n        AND l.campaign_price > 0             -- S\u0131f\u0131r olmayan kampanya fiyat\u0131\n        AND l.campaign_price < l.price       -- Kampanya fiyat\u0131 normal fiyattan d\xFC\u015F\xFCk\n        AND l.created_at >= NOW() - INTERVAL '".concat(days_back, " days'\n        AND ((l.price - l.campaign_price) / l.price) >= ($2 / 100.0)  -- Minimum indirim\n      ORDER BY p.id, l.price, l.campaign_price, discount_percentage DESC, l.created_at DESC\n      LIMIT 100\n    ");
          console.log("🔍 Executing CORRECTED campaign query with params:", [finalProductId, min_discount]);
          console.log("🔍 Logic: Only records with valid campaign_price (NOT NULL, > 0, < normal_price)");
          _context8.next = 19;
          return regeneratorRuntime.awrap(_db["default"].query(campaignQuery, [finalProductId, min_discount]));

        case 19:
          result = _context8.sent;
          campaigns = result.rows;
          console.log("\u2705 Found ".concat(campaigns.length, " campaigns")); // İstatistikler hesapla

          stats = {
            total_campaigns: campaigns.length,
            max_discount: campaigns.length > 0 ? Math.max.apply(Math, _toConsumableArray(campaigns.map(function (c) {
              return parseFloat(c.discount_percentage) || 0;
            }))) : 0,
            avg_discount: campaigns.length > 0 ? (campaigns.reduce(function (sum, c) {
              return sum + (parseFloat(c.discount_percentage) || 0);
            }, 0) / campaigns.length).toFixed(2) : 0,
            by_type: {
              flash_sale: campaigns.filter(function (c) {
                return c.campaign_type === "flash_sale";
              }).length,
              sudden_drop: campaigns.filter(function (c) {
                return c.campaign_type === "sudden_drop";
              }).length,
              regular_discount: campaigns.filter(function (c) {
                return c.campaign_type === "regular_discount";
              }).length,
              minor_discount: campaigns.filter(function (c) {
                return c.campaign_type === "minor_discount";
              }).length
            },
            by_confidence: {
              high: campaigns.filter(function (c) {
                return c.confidence_level === "high";
              }).length,
              medium: campaigns.filter(function (c) {
                return c.confidence_level === "medium";
              }).length,
              low: campaigns.filter(function (c) {
                return c.confidence_level === "low";
              }).length
            },
            by_platform: {}
          }; // Platform istatistikleri

          campaigns.forEach(function (campaign) {
            var platform = campaign.platform || "unknown";
            stats.by_platform[platform] = (stats.by_platform[platform] || 0) + 1;
          });
          res.json({
            success: true,
            data: campaigns,
            stats: stats,
            query_params: {
              final_product_id: finalProductId,
              min_discount_percentage: min_discount,
              days_back: days_back
            },
            message: "".concat(campaigns.length, " kampanya tespiti bulundu")
          });
          _context8.next = 32;
          break;

        case 27:
          _context8.prev = 27;
          _context8.t0 = _context8["catch"](3);
          console.error("❌ Price drops error:", _context8.t0);
          console.error("❌ Stack trace:", _context8.t0.stack);
          res.status(500).json({
            success: false,
            message: "Kampanya tespiti yapılırken hata oluştu",
            error: _context8.t0.message,
            debug: {
              finalProductId: finalProductId,
              query_params: {
                min_discount: min_discount,
                days_back: days_back
              },
              error_code: _context8.t0.code,
              error_detail: _context8.t0.detail,
              error_hint: _context8.t0.hint
            }
          });

        case 32:
        case "end":
          return _context8.stop();
      }
    }
  }, null, null, [[3, 27]]);
}); // Detailed debug endpoint

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

router.get("/debug-campaigns/:finalProductId", _auth.authenticateToken, function _callee9(req, res) {
  var finalProductId, debugResults, fpQuery, matchesQuery, priceAnalysisQuery, recentLogsQuery, conditionTestQuery;
  return regeneratorRuntime.async(function _callee9$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          finalProductId = req.params.finalProductId;
          _context9.prev = 1;
          console.log("🧪 Detailed debug for final product:", finalProductId);
          debugResults = {}; // 1. Final Product kontrolü

          fpQuery = "\n      SELECT fp.id, fp.name, COUNT(m.product_id) as matched_products\n      FROM final_products fp\n      LEFT JOIN final_product_matches m ON fp.id = m.final_product_id\n      WHERE fp.id = $1\n      GROUP BY fp.id, fp.name\n    ";
          _context9.next = 7;
          return regeneratorRuntime.awrap(_db["default"].query(fpQuery, [finalProductId]));

        case 7:
          debugResults.final_product = _context9.sent;
          // 2. Eşleşmiş ürünler
          matchesQuery = "\n      SELECT m.product_id, p.title, p.platform, p.product_link\n      FROM final_product_matches m\n      JOIN products p ON m.product_id = p.id\n      WHERE m.final_product_id = $1\n    ";
          _context9.next = 11;
          return regeneratorRuntime.awrap(_db["default"].query(matchesQuery, [finalProductId]));

        case 11:
          debugResults.matched_products = _context9.sent;
          // 3. Price logs analizi
          priceAnalysisQuery = "\n      SELECT \n        p.id, p.title, p.platform,\n        COUNT(l.id) as total_logs,\n        COUNT(CASE WHEN l.campaign_price IS NOT NULL THEN 1 END) as with_campaign,\n        COUNT(CASE WHEN l.campaign_price = 0 THEN 1 END) as zero_campaign,\n        COUNT(CASE WHEN l.campaign_price IS NULL THEN 1 END) as null_campaign,\n        MIN(l.price) as min_price, MAX(l.price) as max_price,\n        MIN(l.created_at) as first_log, MAX(l.created_at) as last_log\n      FROM final_product_matches m\n      JOIN products p ON m.product_id = p.id\n      LEFT JOIN product_price_logs l ON l.product_id = p.id\n      WHERE m.final_product_id = $1\n      GROUP BY p.id, p.title, p.platform\n    ";
          _context9.next = 15;
          return regeneratorRuntime.awrap(_db["default"].query(priceAnalysisQuery, [finalProductId]));

        case 15:
          debugResults.price_analysis = _context9.sent;
          // 4. Son 10 price log
          recentLogsQuery = "\n      SELECT \n        p.platform, p.title, l.price, l.campaign_price, l.created_at,\n        CASE \n          WHEN l.campaign_price IS NULL THEN 'NULL'\n          WHEN l.campaign_price = 0 THEN 'ZERO'\n          ELSE 'HAS_VALUE'\n        END as campaign_status,\n        CASE WHEN l.campaign_price IS NULL OR l.campaign_price = 0 \n             THEN ROUND(((l.price - 0) / l.price) * 100, 2)\n             ELSE ROUND(((l.price - l.campaign_price) / l.price) * 100, 2)\n        END as calculated_discount\n      FROM final_product_matches m\n      JOIN products p ON m.product_id = p.id\n      JOIN product_price_logs l ON l.product_id = p.id\n      WHERE m.final_product_id = $1\n      ORDER BY l.created_at DESC\n      LIMIT 10\n    ";
          _context9.next = 19;
          return regeneratorRuntime.awrap(_db["default"].query(recentLogsQuery, [finalProductId]));

        case 19:
          debugResults.recent_logs = _context9.sent;
          // 5. Koşul testleri
          conditionTestQuery = "\n      SELECT \n        p.platform, l.price, l.campaign_price,\n        CASE WHEN l.price > 0 THEN 'PASS' ELSE 'FAIL' END as price_check,\n        CASE WHEN l.created_at >= NOW() - INTERVAL '30 days' THEN 'PASS' ELSE 'FAIL' END as date_check,\n        CASE \n          WHEN (l.campaign_price IS NOT NULL AND l.campaign_price > 0 AND ((l.price - l.campaign_price) / l.price) >= 0.05) THEN 'NORMAL_DISCOUNT'\n          WHEN (l.campaign_price IS NULL OR l.campaign_price = 0) THEN 'FREE_PRODUCT'\n          ELSE 'NO_MATCH'\n        END as condition_result,\n        l.created_at\n      FROM final_product_matches m\n      JOIN products p ON m.product_id = p.id\n      JOIN product_price_logs l ON l.product_id = p.id\n      WHERE m.final_product_id = $1\n      ORDER BY l.created_at DESC\n      LIMIT 5\n    ";
          _context9.next = 23;
          return regeneratorRuntime.awrap(_db["default"].query(conditionTestQuery, [finalProductId]));

        case 23:
          debugResults.condition_tests = _context9.sent;
          res.json({
            success: true,
            debug_results: debugResults,
            summary: {
              final_product_exists: debugResults.final_product.rows.length > 0,
              matched_products_count: debugResults.matched_products.rows.length,
              total_price_logs: debugResults.price_analysis.rows.reduce(function (sum, row) {
                return sum + parseInt(row.total_logs);
              }, 0),
              recent_logs_count: debugResults.recent_logs.rows.length,
              free_products_count: debugResults.recent_logs.rows.filter(function (row) {
                return row.campaign_status !== "HAS_VALUE";
              }).length
            }
          });
          _context9.next = 31;
          break;

        case 27:
          _context9.prev = 27;
          _context9.t0 = _context9["catch"](1);
          console.error("❌ Debug error:", _context9.t0);
          res.status(500).json({
            success: false,
            error: _context9.t0.message,
            stack: _context9.t0.stack
          });

        case 31:
        case "end":
          return _context9.stop();
      }
    }
  }, null, null, [[1, 27]]);
});
var _default = router;
exports["default"] = _default;