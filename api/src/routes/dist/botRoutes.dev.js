"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _axios = _interopRequireDefault(require("axios"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

var _auth = require("../middleware/auth.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); if (enumerableOnly) symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; }); keys.push.apply(keys, symbols); } return keys; }

function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i] != null ? arguments[i] : {}; if (i % 2) { ownKeys(source, true).forEach(function (key) { _defineProperty(target, key, source[key]); }); } else if (Object.getOwnPropertyDescriptors) { Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)); } else { ownKeys(source).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } } return target; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var router = _express["default"].Router();

var BOT_SERVICE_URL = process.env.BOT_SERVICE_URL || "http://bot:8000";

var LOG_FILE = _path["default"].join(process.cwd(), "logs", "bot-logs.json");

var logBotActivity = function logBotActivity(botName, message) {
  var log, logs, content;
  return regeneratorRuntime.async(function logBotActivity$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          log = {
            bot: botName,
            message: message,
            timestamp: new Date().toISOString()
          };
          logs = [];

          if (_fs["default"].existsSync(LOG_FILE)) {
            content = _fs["default"].readFileSync(LOG_FILE, "utf-8");
            logs = JSON.parse(content || "[]");
          }

          logs.unshift(log);

          _fs["default"].writeFileSync(LOG_FILE, JSON.stringify(logs.slice(0, 1000), null, 2));

        case 5:
        case "end":
          return _context.stop();
      }
    }
  });
};
/**
 * @swagger
 * components:
 *   schemas:
 *     BotRequest:
 *       type: object
 *       required:
 *         - bot_name
 *       properties:
 *         bot_name:
 *           type: string
 *           description: Bot adı
 *           example: "my-bot"
 *     BotResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *         message:
 *           type: string
 *         data:
 *           type: object
 *     HealthResponse:
 *       type: object
 *       properties:
 *         api:
 *           type: string
 *         bot_service_url:
 *           type: string
 *         bot_service:
 *           type: object
 */

/**
 * @swagger
 * /api/terms:
 *   get:
 *     summary: Arama terimlerini getir
 *     tags: [Bot Management]
 *     security:
 *       - bearerAuth: []
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
 *                 terms:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Sunucu hatası
 *   post:
 *     summary: Arama terimlerini güncelle
 *     tags: [Bot Management]
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
 *         description: Terimler güncellendi
 *       500:
 *         description: Sunucu hatası
 */


router.get("/terms", _auth.authenticateToken, function _callee(req, res) {
  var response;
  return regeneratorRuntime.async(function _callee$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          _context2.prev = 0;
          _context2.next = 3;
          return regeneratorRuntime.awrap(_axios["default"].get("".concat(BOT_SERVICE_URL, "/terms")));

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
            message: "Terimler alınamadı",
            error: _context2.t0.message
          });

        case 10:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[0, 7]]);
});
router.post("/terms", _auth.authenticateToken, function _callee2(req, res) {
  var response;
  return regeneratorRuntime.async(function _callee2$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          _context3.next = 3;
          return regeneratorRuntime.awrap(_axios["default"].post("".concat(BOT_SERVICE_URL, "/terms"), req.body));

        case 3:
          response = _context3.sent;
          res.json(response.data);
          _context3.next = 10;
          break;

        case 7:
          _context3.prev = 7;
          _context3.t0 = _context3["catch"](0);
          res.status(500).json({
            success: false,
            message: "Terimler güncellenemedi",
            error: _context3.t0.message
          });

        case 10:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 7]]);
});
/**
 * @swagger
 * /api/bot-logs:
 *   get:
 *     summary: Bot loglarını getir
 *     tags: [Bot Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bot logları
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   bot:
 *                     type: string
 *                   message:
 *                     type: string
 *                   timestamp:
 *                     type: string
 */

router.get("/bot-logs", _auth.authenticateToken, function _callee3(req, res) {
  var content, logs;
  return regeneratorRuntime.async(function _callee3$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          if (_fs["default"].existsSync(LOG_FILE)) {
            _context4.next = 2;
            break;
          }

          return _context4.abrupt("return", res.json([]));

        case 2:
          content = _fs["default"].readFileSync(LOG_FILE, "utf-8");
          logs = JSON.parse(content || "[]");
          res.json(logs);

        case 5:
        case "end":
          return _context4.stop();
      }
    }
  });
});
/**
 * @swagger
 * /api/start-trendyol:
 *   post:
 *     summary: Trendyol botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BotResponse'
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-trendyol-detail:
 *   post:
 *     summary: Trendyol detay botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-n11:
 *   post:
 *     summary: N11 botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-n11-detail:
 *   post:
 *     summary: N11 detay botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-hepsiburada:
 *   post:
 *     summary: Hepsiburada botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-hepsiburada-detail:
 *   post:
 *     summary: Hepsiburada detay botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-avansas:
 *   post:
 *     summary: Avansas botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

/**
 * @swagger
 * /api/start-avansas-detail:
 *   post:
 *     summary: Avansas detay botunu başlat
 *     tags: [Bot Operations]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BotRequest'
 *     responses:
 *       200:
 *         description: Bot başlatıldı
 *       400:
 *         description: Geçersiz istek
 *       500:
 *         description: Sunucu hatası
 */

var botEndpoints = [{
  path: "/start-trendyol",
  backend: "/run-trendyol",
  logMsg: "Trendyol botu başlatıldı"
}, {
  path: "/start-trendyol-detail",
  backend: "/run-trendyol-detail",
  logMsg: "Trendyol detay botu başlatıldı"
}, {
  path: "/start-n11",
  backend: "/run-n11",
  logMsg: "N11 botu başlatıldı"
}, {
  path: "/start-n11-detail",
  backend: "/run-n11-detail",
  logMsg: "N11 detay botu başlatıldı"
}, {
  path: "/start-hepsiburada",
  backend: "/run-hepsiburada",
  logMsg: "Hepsiburada botu başlatıldı"
}, {
  path: "/start-hepsiburada-detail",
  backend: "/run-hepsiburada-detail",
  logMsg: "Hepsiburada detay botu başlatıldı"
}, {
  path: "/start-avansas",
  backend: "/run-avansas",
  logMsg: "Avansas botu başlatıldı"
}, {
  path: "/start-avansas-detail",
  backend: "/run-avansas-detail",
  logMsg: "Avansas detay botu başlatıldı"
}];
botEndpoints.forEach(function (_ref) {
  var path = _ref.path,
      backend = _ref.backend,
      logMsg = _ref.logMsg;
  router.post(path, _auth.authenticateToken, function _callee4(req, res) {
    var bot_name, response;
    return regeneratorRuntime.async(function _callee4$(_context5) {
      while (1) {
        switch (_context5.prev = _context5.next) {
          case 0:
            bot_name = req.body.bot_name;

            if (bot_name) {
              _context5.next = 3;
              break;
            }

            return _context5.abrupt("return", res.status(400).json({
              success: false,
              error: "Bot adı gerekli."
            }));

          case 3:
            _context5.prev = 3;
            _context5.next = 6;
            return regeneratorRuntime.awrap(_axios["default"].post("".concat(BOT_SERVICE_URL).concat(backend), {
              bot_name: bot_name
            }));

          case 6:
            response = _context5.sent;
            _context5.next = 9;
            return regeneratorRuntime.awrap(logBotActivity(bot_name, logMsg));

          case 9:
            res.json(_objectSpread({
              success: true
            }, response.data));
            _context5.next = 16;
            break;

          case 12:
            _context5.prev = 12;
            _context5.t0 = _context5["catch"](3);
            console.error("\u274C ".concat(bot_name, " bot hatas\u0131:"), _context5.t0.message);
            res.status(500).json({
              success: false,
              error: "Bot çalıştırılamadı",
              detail: _context5.t0.message
            });

          case 16:
          case "end":
            return _context5.stop();
        }
      }
    }, null, null, [[3, 12]]);
  });
});
/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Sistem durumunu kontrol et
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Sistem durumu
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthResponse'
 */

router.get("/health", function _callee5(req, res) {
  var botHealth;
  return regeneratorRuntime.async(function _callee5$(_context6) {
    while (1) {
      switch (_context6.prev = _context6.next) {
        case 0:
          _context6.prev = 0;
          _context6.next = 3;
          return regeneratorRuntime.awrap(_axios["default"].get("".concat(BOT_SERVICE_URL, "/health"))["catch"](function () {
            return {
              status: "error"
            };
          }));

        case 3:
          botHealth = _context6.sent;
          res.json({
            api: "healthy",
            bot_service_url: BOT_SERVICE_URL,
            bot_service: botHealth.data || "unreachable"
          });
          _context6.next = 10;
          break;

        case 7:
          _context6.prev = 7;
          _context6.t0 = _context6["catch"](0);
          res.json({
            api: "healthy",
            bot_service_url: BOT_SERVICE_URL,
            bot_service: "error"
          });

        case 10:
        case "end":
          return _context6.stop();
      }
    }
  }, null, null, [[0, 7]]);
});
var _default = router;
exports["default"] = _default;