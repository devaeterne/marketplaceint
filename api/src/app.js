import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import botRoutes from "./routes/botRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/auth.js";
import searchRoutes from "./routes/searchRoutes.js";
import setupSwagger from "../swagger.js";
import createTables from "./initDb.js";
import botLogRoutes from "./routes/botLogRoutes.js";
import botLogStreamRoutes from "./routes/botLogStreamRaoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import fProductRoutes from "./routes/fProductRoutes.js";

dotenv.config();

const app = express();

// 🚨 CORS Ayarları – Admin container IP’si için genişletilebilir
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://admin:3000",
      "http://172.20.0.5:3000", // Admin container IP
      "http://admin", // DNS ile çözülüyorsa
    ],
    credentials: true,
  })
);

// Middleware
app.use(express.json());

// Veritabanı tablolarını oluştur
await createTables();

// Routes
app.use("/api", authRoutes);
app.use("/api", botRoutes);
app.use("/api", botLogRoutes);
app.use("/api", botLogStreamRoutes);
app.use("/api", productRoutes);
app.use("/api", fProductRoutes);
app.use("/api", searchRoutes);
app.use("/api", reportRoutes);

// Swagger UI setup
setupSwagger(app);

// Sunucu başlat
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ API aktif: http://localhost:${PORT}`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`🔐 Auth endpoints:`);
  console.log(`   POST /api/auth/signup`);
  console.log(`   POST /api/auth/signin`);
  console.log(`   GET  /api/auth/verify`);
});
