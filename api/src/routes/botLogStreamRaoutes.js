// src/routes/botLogStreamRoutes.js
import express from "express";
import fs from "fs/promises";
import path from "path";
import jwt from "jsonwebtoken";

const router = express.Router();

const LOG_DIR = path.join(process.cwd(), "bot_logs");
const getLogFileName = (botName) => path.join(LOG_DIR, `${botName}_latest.log`);

router.get("/bot-logs/stream/:botName", async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).json({ error: "Token gerekli" });

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "a-string-secret-at-least-256-bits-long"
    );
    req.user = decoded;
  } catch (err) {
    return res.status(401).json({ error: "Geçersiz token" });
  }

  const { botName } = req.params;
  const logFile = getLogFileName(botName);

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });

  try {
    await fs.mkdir(LOG_DIR, { recursive: true });
  } catch (err) {
    console.log("Log dizini oluşturma hatası:", err.message);
  }

  res.write(
    `data: ${JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "INFO",
      message: "Log stream başlatıldı",
    })}\n\n`
  );

  try {
    await fs.access(logFile);
  } catch {
    await fs.writeFile(logFile, "");
  }

  let lastSize = 0;
  try {
    const stats = await fs.stat(logFile);
    lastSize = stats.size;
  } catch (err) {
    console.error("İlk log dosyası boyutu alınamadı:", err);
  }

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
    } catch (err) {
      console.error("watchFile hatası:", err);
    }
  };

  const interval = setInterval(watchFile, 500);

  req.on("close", () => {
    clearInterval(interval);
    res.end();
  });
});

function parseLogLine(line) {
  // Python log formatı: 2025-08-06 02:55:21,296 - INFO - Mesaj
  const regex =
    /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[.,]\d{3}) - (\w+) - (.*)$/;
  const match = line.match(regex);

  if (match) {
    const [, rawTime, rawLevel, message] = match;

    return {
      timestamp: new Date(rawTime.replace(",", ".")).toISOString(), // ',' yerine '.' convert
      level: rawLevel.toUpperCase(),
      message: message.trim(),
    };
  }

  // fallback (log formatı uymadıysa)
  return {
    timestamp: new Date().toISOString(),
    level: "INFO",
    message: line.trim(),
  };
}

export default router;
