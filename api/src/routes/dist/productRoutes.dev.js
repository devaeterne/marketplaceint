"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _db = _interopRequireDefault(require("../db.js"));

var _auth = require("../middleware/auth.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

// src/routes/productRoutes.js
var router = _express["default"].Router();
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


router.post("/categories", _auth.authenticateToken, function _callee(req, res) {
  var _req$body, name, parent_id, existing, result;

  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _req$body = req.body, name = _req$body.name, parent_id = _req$body.parent_id;

          if (!(!name || name.trim() === "")) {
            _context.next = 3;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            success: false,
            message: "Kategori adı zorunludur."
          }));

        case 3:
          _context.prev = 3;
          _context.next = 6;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT * FROM standard_categories WHERE name = $1", [name]));

        case 6:
          existing = _context.sent;

          if (!(existing.rows.length > 0)) {
            _context.next = 9;
            break;
          }

          return _context.abrupt("return", res.status(400).json({
            success: false,
            message: "Bu kategori zaten mevcut."
          }));

        case 9:
          _context.next = 11;
          return regeneratorRuntime.awrap(_db["default"].query("INSERT INTO standard_categories (name, parent_id) VALUES ($1, $2) RETURNING *", [name.trim(), parent_id || null]));

        case 11:
          result = _context.sent;
          return _context.abrupt("return", res.status(201).json({
            success: true,
            category: result.rows[0]
          }));

        case 15:
          _context.prev = 15;
          _context.t0 = _context["catch"](3);
          console.error("Kategori eklenemedi:", _context.t0.message);
          res.status(500).json({
            success: false,
            message: "Sunucu hatası."
          });

        case 19:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[3, 15]]);
}); // GET /api/categories

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

router.get("/categories", _auth.authenticateToken, function _callee2(req, res) {
  var page, limit, offset, result;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          page = parseInt(req.query.page) || 1;
          limit = parseInt(req.query.limit) || 10;
          offset = (page - 1) * limit;
          _context2.next = 6;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT id, name, parent_id FROM public.standard_categories ORDER BY id ASC LIMIT $1 OFFSET $2", [limit, offset]));

        case 6:
          result = _context2.sent;
          res.json({
            success: true,
            categories: result.rows,
            total: result.rows.length
          });
          _context2.next = 14;
          break;

        case 10:
          _context2.prev = 10;
          _context2.t0 = _context2["catch"](0);
          console.error("Kategori sorgusu hatası:", _context2.t0); // 🔍

          res.status(500).json({
            error: "Veritabanı hatası",
            detail: _context2.t0.message
          });

        case 14:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 10]]);
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

router.get("/tags", _auth.authenticateToken, function _callee3(req, res) {
  var result;
  return regeneratorRuntime.async(function _callee3$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _context3.next = 3;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT id, name, ikas_tag_id, created_at FROM product_tags ORDER BY id DESC"));

        case 3:
          result = _context3.sent;
          return _context3.abrupt("return", res.json({
            success: true,
            tags: result.rows,
            total: result.rowCount
          }));

        case 7:
          _context3.prev = 7;
          _context3.t0 = _context3["catch"](0);
          console.error("Etiketler alınamadı:", _context3.t0.message);
          return _context3.abrupt("return", res.status(500).json({
            success: false,
            message: "Etiketler alınamadı"
          }));

        case 11:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 7]]);
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

router.post("/tags", _auth.authenticateToken, function _callee4(req, res) {
  var _req$body2, name, ikas_tag_id, existing, insertResult;

  return regeneratorRuntime.async(function _callee4$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _req$body2 = req.body, name = _req$body2.name, ikas_tag_id = _req$body2.ikas_tag_id;

          if (!(!name || name.trim() === "")) {
            _context4.next = 3;
            break;
          }

          return _context4.abrupt("return", res.status(400).json({
            success: false,
            message: "Etiket adı zorunludur."
          }));

        case 3:
          _context4.prev = 3;
          _context4.next = 6;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT * FROM product_tags WHERE name = $1", [name]));

        case 6:
          existing = _context4.sent;

          if (!(existing.rows.length > 0)) {
            _context4.next = 9;
            break;
          }

          return _context4.abrupt("return", res.status(400).json({
            success: false,
            message: "Bu etiket zaten mevcut."
          }));

        case 9:
          _context4.next = 11;
          return regeneratorRuntime.awrap(_db["default"].query("INSERT INTO product_tags (name, ikas_tag_id) VALUES ($1, $2) RETURNING *", [name, ikas_tag_id || null]));

        case 11:
          insertResult = _context4.sent;
          return _context4.abrupt("return", res.status(201).json({
            success: true,
            tag: insertResult.rows[0]
          }));

        case 15:
          _context4.prev = 15;
          _context4.t0 = _context4["catch"](3);
          console.error("Etiket eklenemedi:", _context4.t0.message);
          return _context4.abrupt("return", res.status(500).json({
            success: false,
            message: "Sunucu hatası."
          }));

        case 19:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[3, 15]]);
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

router.get("/products", _auth.authenticateToken, function _callee5(req, res) {
  var _req$query, _req$query$page, page, _req$query$limit, limit, platform, product_type, attribute_name, attribute_value, search, _req$query$sort_by, sort_by, _req$query$sort_order, sort_order, offset, countQuery, dataQuery, countResult, dataResult;

  return regeneratorRuntime.async(function _callee5$(_context5) {
    while (1) {
      switch (_context5.prev = _context5.next) {
        case 0:
          _req$query = req.query, _req$query$page = _req$query.page, page = _req$query$page === void 0 ? 1 : _req$query$page, _req$query$limit = _req$query.limit, limit = _req$query$limit === void 0 ? 20 : _req$query$limit, platform = _req$query.platform, product_type = _req$query.product_type, attribute_name = _req$query.attribute_name, attribute_value = _req$query.attribute_value, search = _req$query.search, _req$query$sort_by = _req$query.sort_by, sort_by = _req$query$sort_by === void 0 ? "created_at" : _req$query$sort_by, _req$query$sort_order = _req$query.sort_order, sort_order = _req$query$sort_order === void 0 ? "desc" : _req$query$sort_order;
          offset = (page - 1) * limit;
          _context5.prev = 2;
          countQuery = "\n      SELECT COUNT(*) FROM products p\n      LEFT JOIN product_details pd ON pd.product_id = p.id\n      WHERE 1 = 1\n        AND ($1::text IS NULL OR p.platform = $1)\n        AND ($2::text IS NULL OR pd.product_type ILIKE '%' || $2 || '%')\n        AND (\n          $3::text IS NULL OR EXISTS (\n            SELECT 1 FROM product_attributes pa\n            WHERE pa.product_id = p.id\n              AND pa.attribute_name = $3\n              AND pa.attribute_value ILIKE '%' || $4 || '%'\n          )\n        )\n        AND ($5::text IS NULL OR p.title ILIKE '%' || $5 || '%' OR p.brand ILIKE '%' || $5 || '%')\n    ";
          dataQuery = "\n      SELECT\n        p.id,\n        p.title,\n        p.brand,\n        p.platform,\n        p.product_link,\n        pd.product_type,\n        pd.rating,\n        pd.image_url,\n        pl.price AS latest_price\n      FROM products p\n      LEFT JOIN product_details pd ON pd.product_id = p.id\n      LEFT JOIN LATERAL (\n        SELECT price FROM product_price_logs\n        WHERE product_id = p.id\n        ORDER BY created_at DESC\n        LIMIT 1\n      ) pl ON true\n      WHERE 1 = 1\n        AND ($1::text IS NULL OR p.platform = $1)\n        AND ($2::text IS NULL OR pd.product_type ILIKE '%' || $2 || '%')\n        AND (\n          $3::text IS NULL OR EXISTS (\n            SELECT 1 FROM product_attributes pa\n            WHERE pa.product_id = p.id\n              AND pa.attribute_name = $3\n              AND pa.attribute_value ILIKE '%' || $4 || '%'\n          )\n        )\n        AND ($5::text IS NULL OR p.title ILIKE '%' || $5 || '%' OR p.brand ILIKE '%' || $5 || '%')\n      ORDER BY \n        CASE WHEN $6 = 'price' AND $7 = 'asc' THEN pl.price END ASC,\n        CASE WHEN $6 = 'price' AND $7 = 'desc' THEN pl.price END DESC,\n        CASE WHEN $6 = 'created_at' AND $7 = 'asc' THEN p.created_at END ASC,\n        CASE WHEN $6 = 'created_at' AND $7 = 'desc' THEN p.created_at END DESC,\n        CASE WHEN $6 = 'title' AND $7 = 'asc' THEN p.title END ASC,\n        CASE WHEN $6 = 'title' AND $7 = 'desc' THEN p.title END DESC\n      LIMIT $8 OFFSET $9;\n    ";
          _context5.next = 7;
          return regeneratorRuntime.awrap(_db["default"].query(countQuery, [platform || null, product_type || null, attribute_name || null, attribute_value || null, search || null]));

        case 7:
          countResult = _context5.sent;
          _context5.next = 10;
          return regeneratorRuntime.awrap(_db["default"].query(dataQuery, [platform || null, product_type || null, attribute_name || null, attribute_value || null, search || null, sort_by, sort_order, limit, offset]));

        case 10:
          dataResult = _context5.sent;
          res.json({
            success: true,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
            products: dataResult.rows
          });
          _context5.next = 18;
          break;

        case 14:
          _context5.prev = 14;
          _context5.t0 = _context5["catch"](2);
          console.error("🔴 Product fetch error:", _context5.t0.message);
          res.status(500).json({
            success: false,
            message: "Ürünler alınamadı.",
            error: _context5.t0.message
          });

        case 18:
        case "end":
          return _context5.stop();
      }
    }
  }, null, null, [[2, 14]]);
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

router.get("/product_price_logs", _auth.authenticateToken, function _callee6(req, res) {
  var result;
  return regeneratorRuntime.async(function _callee6$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;
          _context6.next = 3;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT * FROM product_price_logs ORDER BY created_at DESC"));

        case 3:
          result = _context6.sent;
          res.json(result.rows);
          _context6.next = 10;
          break;

        case 7:
          _context6.prev = 7;
          _context6.t0 = _context6["catch"](0);
          res.status(500).json({
            error: "Veritabanı hatası",
            detail: _context6.t0.message
          });

        case 10:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[0, 7]]);
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

router.get("/final_products/:id/unmatched-products", _auth.authenticateToken, function _callee7(req, res) {
  var id, result;
  return regeneratorRuntime.async(function _callee7$(_context7) {
    while (1) {
      switch (_context7.prev = _context7.next) {
        case 0:
          id = req.params.id;
          _context7.prev = 1;
          _context7.next = 4;
          return regeneratorRuntime.awrap(_db["default"].query("\n      SELECT p.*, \n             pd.product_type,\n             pd.image_url,\n             pl.price AS latest_price\n      FROM products p\n      LEFT JOIN product_details pd ON pd.product_id = p.id\n      LEFT JOIN LATERAL (\n        SELECT price FROM product_price_logs\n        WHERE product_id = p.id\n        ORDER BY created_at DESC\n        LIMIT 1\n      ) pl ON true\n      WHERE p.id NOT IN (\n        SELECT product_id FROM final_product_matches WHERE final_product_id = $1\n      )\n    ", [id]));

        case 4:
          result = _context7.sent;
          res.json(result.rows);
          _context7.next = 11;
          break;

        case 8:
          _context7.prev = 8;
          _context7.t0 = _context7["catch"](1);
          res.status(500).json({
            error: "Henüz eşleşmemiş ürünler getirilemedi",
            detail: _context7.t0.message
          });

        case 11:
        case "end":
          return _context7.stop();
      }
    }
  }, null, null, [[1, 8]]);
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

router.get("/categories", _auth.authenticateToken, function _callee8(req, res) {
  var result;
  return regeneratorRuntime.async(function _callee8$(_context8) {
    while (1) {
      switch (_context8.prev = _context8.next) {
        case 0:
          _context8.next = 2;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT * FROM standard_categories ORDER BY name ASC"));

        case 2:
          result = _context8.sent;
          res.json(result.rows);

        case 4:
        case "end":
          return _context8.stop();
      }
    }
  });
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

router.get("/tags", _auth.authenticateToken, function _callee9(req, res) {
  var result;
  return regeneratorRuntime.async(function _callee9$(_context9) {
    while (1) {
      switch (_context9.prev = _context9.next) {
        case 0:
          _context9.next = 2;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT * FROM product_tags ORDER BY name ASC"));

        case 2:
          result = _context9.sent;
          res.json(result.rows);

        case 4:
        case "end":
          return _context9.stop();
      }
    }
  });
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

router.get("/product_details", _auth.authenticateToken, function _callee10(req, res) {
  var result;
  return regeneratorRuntime.async(function _callee10$(_context10) {
    while (1) {
      switch (_context10.prev = _context10.next) {
        case 0:
          _context10.prev = 0;
          _context10.next = 3;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT * FROM product_details ORDER BY created_at DESC"));

        case 3:
          result = _context10.sent;
          res.json(result.rows);
          _context10.next = 10;
          break;

        case 7:
          _context10.prev = 7;
          _context10.t0 = _context10["catch"](0);
          res.status(500).json({
            error: "Veritabanı hatası",
            detail: _context10.t0.message
          });

        case 10:
        case "end":
          return _context10.stop();
      }
    }
  }, null, null, [[0, 7]]);
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

router.get("/product_attributes", _auth.authenticateToken, function _callee11(req, res) {
  var result;
  return regeneratorRuntime.async(function _callee11$(_context11) {
    while (1) {
      switch (_context11.prev = _context11.next) {
        case 0:
          _context11.prev = 0;
          _context11.next = 3;
          return regeneratorRuntime.awrap(_db["default"].query("SELECT * FROM product_attributes ORDER BY created_at DESC"));

        case 3:
          result = _context11.sent;
          res.json(result.rows);
          _context11.next = 10;
          break;

        case 7:
          _context11.prev = 7;
          _context11.t0 = _context11["catch"](0);
          res.status(500).json({
            error: "Veritabanı hatası",
            detail: _context11.t0.message
          });

        case 10:
        case "end":
          return _context11.stop();
      }
    }
  }, null, null, [[0, 7]]);
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

router.get("/search-terms-log", _auth.authenticateToken, function _callee12(req, res) {
  var result;
  return regeneratorRuntime.async(function _callee12$(_context12) {
    while (1) {
      switch (_context12.prev = _context12.next) {
        case 0:
          _context12.prev = 0;
          _context12.next = 3;
          return regeneratorRuntime.awrap(_db["default"].query("\n      SELECT\n        term,\n        MAX(CASE WHEN platform = 'hepsiburada' THEN count ELSE 0 END) AS \"hepsiburadaCount\",\n        MAX(CASE WHEN platform = 'trendyol' THEN count ELSE 0 END) AS \"trendyolCount\",\n        MAX(CASE WHEN platform = 'avansas' THEN count ELSE 0 END) AS \"avansasCount\",\n        MAX(CASE WHEN platform = 'n11' THEN count ELSE 0 END) AS \"n11Count\"\n      FROM public.search_terms\n      GROUP BY term\n      ORDER BY term\n    "));

        case 3:
          result = _context12.sent;
          res.json({
            success: true,
            data: result.rows
          });
          _context12.next = 11;
          break;

        case 7:
          _context12.prev = 7;
          _context12.t0 = _context12["catch"](0);
          console.error("🔴 Arama özet hatası:", _context12.t0);
          res.status(500).json({
            success: false,
            error: "Sunucu hatası"
          });

        case 11:
        case "end":
          return _context12.stop();
      }
    }
  }, null, null, [[0, 7]]);
});
var _default = router;
exports["default"] = _default;