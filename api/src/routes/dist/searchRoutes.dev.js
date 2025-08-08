"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _axios = _interopRequireDefault(require("axios"));

var _auth = require("../middleware/auth.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var router = _express["default"].Router();

var BOT_SERVICE_URL = process.env.BOT_SERVICE_URL || "http://bot:8000"; // GET terms

/**
 * @swagger
 * /api/terms:
 *   get:
 *     summary: Bot terimlerini getir
 *     tags: [Search Terms]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Terimler listesi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 terms:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Sunucu hatası
 */

router.get("/terms", _auth.authenticateToken, function _callee(req, res) {
  var response;
  return regeneratorRuntime.async(function _callee$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(_axios["default"].get("".concat(BOT_SERVICE_URL, "/terms")));

        case 3:
          response = _context.sent;
          res.json(response.data);
          _context.next = 10;
          break;

        case 7:
          _context.prev = 7;
          _context.t0 = _context["catch"](0);
          res.status(500).json({
            success: false,
            message: "Terimler alınamadı",
            error: _context.t0.message
          });

        case 10:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 7]]);
}); // POST terms

/**
 * @swagger
 * /api/terms:
 *   post:
 *     summary: Bot terimlerini güncelle
 *     tags: [Search Terms]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               terms:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Güncellendi
 *       500:
 *         description: Sunucu hatası
 */

router.post("/terms", _auth.authenticateToken, function _callee2(req, res) {
  var response;
  return regeneratorRuntime.async(function _callee2$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _context2.next = 3;
          return regeneratorRuntime.awrap(_axios["default"].post("".concat(BOT_SERVICE_URL, "/terms"), req.body));

        case 3:
          response = _context2.sent;
          res.json(response.data);
          _context2.next = 10;
          break;

        case 7:
          _context2.prev = 7;
          _context2.t0 = _context2["catch"](0);
          res.status(500).json({
            success: false,
            message: "Terimler güncellenemedi",
            error: _context2.t0.message
          });

        case 10:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 7]]);
});
var _default = router;
exports["default"] = _default;