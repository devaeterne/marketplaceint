import express from "express";
import dotenv from "dotenv";
dotenv.config();

import botRoutes from "./routes/botRoutes.js";
import setupSwagger from "../swagger.js"; // setupSwagger sonra çağrılacak
import createTables from "./initDb.js";
import productRoutes from "./routes/productRoutes.js";

const app = express(); // ✅ önce app tanımlanmalı

app.use(express.json());

await createTables(); // DB tablolarını oluştur

app.use("/api", botRoutes);
app.use("/api", productRoutes);

setupSwagger(app); // ✅ burada artık app hazır olduğu için çağırabiliriz

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ API aktif: http://localhost:${PORT}`);
  console.log(`📚 Swagger UI: http://localhost:${PORT}/api-docs`);
});
