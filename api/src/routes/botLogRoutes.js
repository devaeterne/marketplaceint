// src/routes/botLogRoutes.js
import express from "express";
import fs from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

// Log dosyalarının bulunduğu dizin - Docker volume
const LOG_DIR = path.join(process.cwd(), "bot_logs");

// Log dosyası adını al
const getLogFileName = (botName) => {
  const normalizedName = botName.toLowerCase();
  return path.join(LOG_DIR, `${normalizedName}_latest.log`);
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
router.get("/bot-logs/stream/:botName", async (req, res) => {
  // Token kontrolü - query string'den al
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ error: "Token gerekli" });
  }

  // Token'ı doğrula
  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "a-string-secret-at-least-256-bits-long"
    );
    req.user = decoded;
  } catch (error) {
    return res.status(401).json({ error: "Geçersiz token" });
  }

  const { botName } = req.params;
  const logFile = getLogFileName(botName);

  // SSE headers
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  // Log dizinini oluştur
  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (error) {
    console.log("Log dizini oluşturma:", error.message);
  }

  // İlk bağlantı mesajı
  res.write(
    `data: ${JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "INFO",
      message: "Log stream başlatıldı",
    })}\n\n`
  );

  // Log dosyası yoksa oluştur
  try {
    await fs.access(logFile);
  } catch {
    await fs.writeFile(logFile, "");
  }

  try {
    // Basit file watcher kullan (tail yerine)
    let lastSize = 0;

    const watchFile = async () => {
      try {
        const stats = await fs.stat(logFile);
        if (stats.size > lastSize) {
          const buffer = Buffer.alloc(stats.size - lastSize);
          const fileHandle = await fs.open(logFile, "r");
          await fileHandle.read(buffer, 0, buffer.length, lastSize);
          await fileHandle.close();

          const newContent = buffer.toString("utf8");
          const lines = newContent.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            const logEntry = parseLogLine(line);
            res.write(`data: ${JSON.stringify(logEntry)}\n\n`);
          }

          lastSize = stats.size;
        }
      } catch (error) {
        console.error("File watch error:", error);
      }
    };

    // Her 500ms'de bir dosyayı kontrol et
    const interval = setInterval(watchFile, 500);

    // Bağlantı koptuğunda interval'i durdur
    req.on("close", () => {
      clearInterval(interval);
      res.end();
    });
  } catch (error) {
    res.write(
      `data: ${JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "ERROR",
        message: `Log dosyası açılamadı: ${error.message}`,
      })}\n\n`
    );
  }
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
router.get("/bot-logs/:botName", authenticateToken, async (req, res) => {
  try {
    const { botName } = req.params;
    const logFile = getLogFileName(botName);

    // Log dosyası var mı kontrol et
    try {
      await fs.access(logFile);
    } catch {
      return res.json({ logs: [] });
    }

    // Log dosyasını oku
    const content = await fs.readFile(logFile, "utf8");
    const lines = content.split("\n").filter((line) => line.trim());

    // Son 1000 satırı al
    const recentLines = lines.slice(-1000);

    res.json({ logs: recentLines });
  } catch (error) {
    console.error("Log okuma hatası:", error);
    res.status(500).json({ error: "Log dosyası okunamadı" });
  }
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
router.delete(
  "/bot-logs/:botName/clear",
  authenticateToken,
  async (req, res) => {
    try {
      const { botName } = req.params;
      const logFile = getLogFileName(botName);

      // Dosyayı sıfırla (silmek yerine içeriğini temizle)
      await fs.writeFile(logFile, "");

      res.json({ success: true, message: "Log dosyası temizlendi" });
    } catch (error) {
      console.error("Log temizleme hatası:", error);
      res.status(500).json({ error: "Log dosyası temizlenemedi" });
    }
  }
);

/**
 * Log satırını parse et
 */
function parseLogLine(line) {
  const timestamp = new Date().toISOString();
  let level = "INFO";
  let message = line;

  // Log seviyesini tespit et
  if (line.includes("ERROR") || line.includes("❌")) {
    level = "ERROR";
  } else if (line.includes("WARN") || line.includes("⚠️")) {
    level = "WARN";
  } else if (line.includes("INFO") || line.includes("✅")) {
    level = "INFO";
  } else if (line.includes("DEBUG") || line.includes("🔍")) {
    level = "DEBUG";
  }

  // Timestamp varsa çıkar
  const timestampMatch = line.match(/^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/);
  if (timestampMatch) {
    message = line.substring(timestampMatch[0].length).trim();
  }

  return { timestamp, level, message };
}

export default router;
