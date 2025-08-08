"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _express = _interopRequireDefault(require("express"));

var _promises = _interopRequireDefault(require("fs/promises"));

var _path = _interopRequireDefault(require("path"));

var _jsonwebtoken = _interopRequireDefault(require("jsonwebtoken"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

var router = _express["default"].Router();

var LOG_DIR = _path["default"].join(process.cwd(), "bot_logs");

var getLogFileName = function getLogFileName(botName) {
  return _path["default"].join(LOG_DIR, "".concat(botName, "_latest.log"));
};
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
 *         description: JWT token (query string olarak gönderilir)
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
  var token, decoded, botName, logFile, lastSize, stats, watchFile, interval;
  return regeneratorRuntime.async(function _callee$(_context2) {
    while (1) {
      switch (_context2.prev = _context2.next) {
        case 0:
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
          logFile = getLogFileName(botName);
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
            "Access-Control-Allow-Origin": "*"
          });
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
          console.log("Log dizini oluşturma hatası:", _context2.t1.message);

        case 22:
          res.write("data: ".concat(JSON.stringify({
            timestamp: new Date().toISOString(),
            level: "INFO",
            message: "Log stream başlatıldı"
          }), "\n\n"));
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
          lastSize = 0;
          _context2.prev = 33;
          _context2.next = 36;
          return regeneratorRuntime.awrap(_promises["default"].stat(logFile));

        case 36:
          stats = _context2.sent;
          lastSize = stats.size;
          _context2.next = 43;
          break;

        case 40:
          _context2.prev = 40;
          _context2.t3 = _context2["catch"](33);
          console.error("İlk log dosyası boyutu alınamadı:", _context2.t3);

        case 43:
          watchFile = function watchFile() {
            var _stats, buffer, fileHandle, newContent, lines, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, line, logEntry;

            return regeneratorRuntime.async(function watchFile$(_context) {
              while (1) {
                switch (_context.prev = _context.next) {
                  case 0:
                    _context.prev = 0;
                    _context.next = 3;
                    return regeneratorRuntime.awrap(_promises["default"].stat(logFile));

                  case 3:
                    _stats = _context.sent;

                    if (!(_stats.size > lastSize)) {
                      _context.next = 35;
                      break;
                    }

                    buffer = Buffer.alloc(_stats.size - lastSize);
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
                    lastSize = _stats.size;

                  case 35:
                    _context.next = 40;
                    break;

                  case 37:
                    _context.prev = 37;
                    _context.t1 = _context["catch"](0);
                    console.error("watchFile hatası:", _context.t1);

                  case 40:
                  case "end":
                    return _context.stop();
                }
              }
            }, null, null, [[0, 37], [18, 22, 26, 34], [27,, 29, 33]]);
          };

          interval = setInterval(watchFile, 500);
          req.on("close", function () {
            clearInterval(interval);
            res.end();
          });

        case 46:
        case "end":
          return _context2.stop();
      }
    }
  }, null, null, [[3, 8], [14, 19], [23, 28], [33, 40]]);
});

function parseLogLine(line) {
  // Python log formatı: 2025-08-06 02:55:21,296 - INFO - Mesaj
  var regex = /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[.,]\d{3}) - (\w+) - (.*)$/;
  var match = line.match(regex);

  if (match) {
    var _match = _slicedToArray(match, 4),
        rawTime = _match[1],
        rawLevel = _match[2],
        message = _match[3];

    return {
      timestamp: new Date(rawTime.replace(",", ".")).toISOString(),
      // ',' yerine '.' convert
      level: rawLevel.toUpperCase(),
      message: message.trim()
    };
  } // fallback (log formatı uymadıysa)


  return {
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: line.trim()
  };
}

var _default = router;
exports["default"] = _default;