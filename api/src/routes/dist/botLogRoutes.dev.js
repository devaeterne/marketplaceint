"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _promises = _interopRequireDefault(require("fs/promises"));

var _path = _interopRequireDefault(require("path"));

var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));

var _auth = require("../middleware/auth.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

// src/routes/botLogRoutes.js
var router = _express["default"].Router(); // Log dosyalarının bulunduğu dizin - Docker volume


var LOG_DIR = _path["default"].join(process.cwd(), "bot_logs"); // Log dosyası adını al


var getLogFileName = function getLogFileName(botName) {
  var normalizedName = botName.toLowerCase();
  return _path["default"].join(LOG_DIR, "".concat(normalizedName, "_latest.log"));
};
/**
 * Server-Sent Events ile canlı log streaming
 */

/**
 * @swagger
 * /api/bot-logs/stream/{botName}:
 *   get:
 *     summary: Belirli bir bot için canlı log akışını başlat (SSE)
 *     tags: [Bot Logs]
 *     parameters:
 *       - in: path
 *         name: botName
 *         required: true
 *         schema:
 *           type: string
 *         description: Bot adı
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: JWT token
 *     responses:
 *       200:
 *         description: Log stream başlatıldı
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       401:
 *         description: Yetkisiz (token gerekli veya geçersiz)
 *       500:
 *         description: Sunucu hatası
 */


router.get("/bot-logs/stream/:botName", function _callee(req, res) {
  var token, decoded, botName, logFile, lastSize, watchFile, interval;
  return regeneratorRuntime.async(function _callee$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
          // Token kontrolü - query string'den al
          token = req.query.token;

          if (token) {
            _context2.next = 3;
            break;
          }

          return _context2.abrupt("return", res.status(401).json({
            error: "Token gerekli"
          }));

        case 3:
          _context2.prev = 3;
          decoded = _jsonwebtoken["default"].verify(token, process.env.JWT_SECRET || "a-string-secret-at-least-256-bits-long");
          req.user = decoded;
          _context2.next = 11;
          break;

        case 8:
          _context2.prev = 8;
          _context2.t0 = _context2["catch"](3);
          return _context2.abrupt("return", res.status(401).json({
            error: "Geçersiz token"
          }));

        case 11:
          botName = req.params.botName;
          logFile = getLogFileName(botName); // SSE headers

          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*"
          }); // Log dizinini oluştur

          _context2.prev = 14;
          _context2.next = 17;
          return regeneratorRuntime.awrap(_promises["default"].mkdir(LOG_DIR, {
            recursive: true
          }));

        case 17:
          _context2.next = 22;
          break;

        case 19:
          _context2.prev = 19;
          _context2.t1 = _context2["catch"](14);
          console.log("Log dizini oluşturma:", _context2.t1.message);

        case 22:
          // İlk bağlantı mesajı
          res.write("data: ".concat(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "INFO",
            message: "Log stream başlatıldı"
          }), "\n\n")); // Log dosyası yoksa oluştur

          _context2.prev = 23;
          _context2.next = 26;
          return regeneratorRuntime.awrap(_promises["default"].access(logFile));

        case 26:
          _context2.next = 32;
          break;

        case 28:
          _context2.prev = 28;
          _context2.t2 = _context2["catch"](23);
          _context2.next = 32;
          return regeneratorRuntime.awrap(_promises["default"].writeFile(logFile, ""));

        case 32:
          try {
            // Basit file watcher kullan (tail yerine)
            lastSize = 0;

            watchFile = function watchFile() {
              var stats, buffer, fileHandle, newContent, lines, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, line, logEntry;

              return regeneratorRuntime.async(function watchFile$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      _context.prev = 0;
                      _context.next = 3;
                      return regeneratorRuntime.awrap(_promises["default"].stat(logFile));

                    case 3:
                      stats = _context.sent;

                      if (!(stats.size > lastSize)) {
                        _context.next = 35;
                        break;
                      }

                      buffer = Buffer.alloc(stats.size - lastSize);
                      _context.next = 8;
                      return regeneratorRuntime.awrap(_promises["default"].open(logFile, "r"));

                    case 8:
                      fileHandle = _context.sent;
                      _context.next = 11;
                      return regeneratorRuntime.awrap(fileHandle.read(buffer, 0, buffer.length, lastSize));

                    case 11:
                      _context.next = 13;
                      return regeneratorRuntime.awrap(fileHandle.close());

                    case 13:
                      newContent = buffer.toString("utf8");
                      lines = newContent.split("\n").filter(function (line) {
                        return line.trim();
                      });
                      _iteratorNormalCompletion = true;
                      _didIteratorError = false;
                      _iteratorError = undefined;
                      _context.prev = 18;

                      for (_iterator = lines[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                        line = _step.value;
                        logEntry = parseLogLine(line);
                        res.write("data: ".concat(JSON.stringify(logEntry), "\n\n"));
                      }

                      _context.next = 26;
                      break;

                    case 22:
                      _context.prev = 22;
                      _context.t0 = _context["catch"](18);
                      _didIteratorError = true;
                      _iteratorError = _context.t0;

                    case 26:
                      _context.prev = 26;
                      _context.prev = 27;

                      if (!_iteratorNormalCompletion && _iterator["return"] != null) {
                        _iterator["return"]();
                      }

                    case 29:
                      _context.prev = 29;

                      if (!_didIteratorError) {
                        _context.next = 32;
                        break;
                      }

                      throw _iteratorError;

                    case 32:
                      return _context.finish(29);

                    case 33:
                      return _context.finish(26);

                    case 34:
                      lastSize = stats.size;

                    case 35:
                      _context.next = 40;
                      break;

                    case 37:
                      _context.prev = 37;
                      _context.t1 = _context["catch"](0);
                      console.error("File watch error:", _context.t1);

                    case 40:
                    case "end":
                      return _context.stop();
                  }
                }
              }, null, null, [[0, 37], [18, 22, 26, 34], [27,, 29, 33]]);
            }; // Her 500ms'de bir dosyayı kontrol et


            interval = setInterval(watchFile, 500); // Bağlantı koptuğunda interval'i durdur

            req.on("close", function () {
              clearInterval(interval);
              res.end();
            });
          } catch (error) {
            res.write("data: ".concat(JSON.stringify({
              timestamp: new Date().toISOString(),
              level: "ERROR",
              message: "Log dosyas\u0131 a\xE7\u0131lamad\u0131: ".concat(error.message)
            }), "\n\n"));
          }

        case 33:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[3, 8], [14, 19], [23, 28]]);
});
/**
 * Mevcut log dosyasını oku
 */

/**
 * @swagger
 * /api/bot-logs/{botName}:
 *   get:
 *     summary: Belirli bir botun loglarını getir (son 1000 satır)
 *     tags: [Bot Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: botName
 *         required: true
 *         schema:
 *           type: string
 *         description: Bot adı
 *     responses:
 *       200:
 *         description: Loglar alındı
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Log dosyası okunamadı
 */

router.get("/bot-logs/:botName", _auth.authenticateToken, function _callee2(req, res) {
  var botName, _logFile, content, lines, recentLines;

  return regeneratorRuntime.async(function _callee2$(_context3) {
    while (1) {
      switch (_context3.prev = _context3.next) {
        case 0:
          _context3.prev = 0;
          botName = req.params.botName;
          _logFile = getLogFileName(botName); // Log dosyası var mı kontrol et

          _context3.prev = 3;
          _context3.next = 6;
          return regeneratorRuntime.awrap(_promises["default"].access(_logFile));

        case 6:
          _context3.next = 11;
          break;

        case 8:
          _context3.prev = 8;
          _context3.t0 = _context3["catch"](3);
          return _context3.abrupt("return", res.json({
            logs: []
          }));

        case 11:
          _context3.next = 13;
          return regeneratorRuntime.awrap(_promises["default"].readFile(_logFile, "utf8"));

        case 13:
          content = _context3.sent;
          lines = content.split("\n").filter(function (line) {
            return line.trim();
          }); // Son 1000 satırı al

          recentLines = lines.slice(-1000);
          res.json({
            logs: recentLines
          });
          _context3.next = 23;
          break;

        case 19:
          _context3.prev = 19;
          _context3.t1 = _context3["catch"](0);
          console.error("Log okuma hatası:", _context3.t1);
          res.status(500).json({
            error: "Log dosyası okunamadı"
          });

        case 23:
        case "end":
          return _context3.stop();
      }
    }
  }, null, null, [[0, 19], [3, 8]]);
});
/**
 * Log dosyasını temizle
 */

/**
 * @swagger
 * /api/bot-logs/{botName}/clear:
 *   delete:
 *     summary: Belirli bir botun log dosyasını temizle
 *     tags: [Bot Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: botName
 *         required: true
 *         schema:
 *           type: string
 *         description: Bot adı
 *     responses:
 *       200:
 *         description: Log dosyası temizlendi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       500:
 *         description: Log dosyası temizlenemedi
 */

router["delete"]("/bot-logs/:botName/clear", _auth.authenticateToken, function _callee3(req, res) {
  var botName, _logFile2;

  return regeneratorRuntime.async(function _callee3$(_context4) {
    while (1) {
      switch (_context4.prev = _context4.next) {
        case 0:
          _context4.prev = 0;
          botName = req.params.botName;
          _logFile2 = getLogFileName(botName); // Dosyayı sıfırla (silmek yerine içeriğini temizle)

          _context4.next = 5;
          return regeneratorRuntime.awrap(_promises["default"].writeFile(_logFile2, ""));

        case 5:
          res.json({
            success: true,
            message: "Log dosyası temizlendi"
          });
          _context4.next = 12;
          break;

        case 8:
          _context4.prev = 8;
          _context4.t0 = _context4["catch"](0);
          console.error("Log temizleme hatası:", _context4.t0);
          res.status(500).json({
            error: "Log dosyası temizlenemedi"
          });

        case 12:
        case "end":
          return _context4.stop();
      }
    }
  }, null, null, [[0, 8]]);
});
/**
 * Log satırını parse et
 */

function parseLogLine(line) {
  var timestamp = new Date().toISOString();
  var level = "INFO";
  var message = line; // Log seviyesini tespit et

  if (line.includes("ERROR") || line.includes("❌")) {
    level = "ERROR";
  } else if (line.includes("WARN") || line.includes("⚠️")) {
    level = "WARN";
  } else if (line.includes("INFO") || line.includes("✅")) {
    level = "INFO";
  } else if (line.includes("DEBUG") || line.includes("🔍")) {
    level = "DEBUG";
  } // Timestamp varsa çıkar


  var timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);

  if (timestampMatch) {
    message = line.substring(timestampMatch[0].length).trim();
  }

  return {
    timestamp: timestamp,
    level: level,
    message: message
  };
}

var _default = router;
exports["default"] = _default;