import express from "express";
import cors from "cors"; // Bu satır var mı kontrol edin
import dotenv from "dotenv";
dotenv.config();

import botRoutes from "./routes/botRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import authRoutes from "./routes/auth.js";
import setupSwagger from "../swagger.js";
import createTables from "./initDb.js";

const app = express();

// CORS ayarı - bu çok önemli!
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

app.use(express.json());

await createTables();

// Routes
app.use("/api", botRoutes);
app.use("/api", productRoutes);
app.use("/api", authRoutes);

setupSwagger(app);

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ API aktif: http://localhost:${PORT}`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`🔐 Auth endpoints:`);
  console.log(`   POST /api/auth/signup`);
  console.log(`   POST /api/auth/signin`);
  console.log(`   GET  /api/auth/verify`);
});
