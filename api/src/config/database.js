import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PG_HOST || "localhost",
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DB || "ikasdb",
  user: process.env.PG_USER || "ikasuser",
  password: process.env.PG_PASS || "ikaspass",
});

// Bağlantı test et
pool.on("connect", () => {
  console.log("✅ PostgreSQL veritabanına bağlanıldı");
});

pool.on("error", (err) => {
  console.error("❌ PostgreSQL bağlantı hatası:", err);
});

export default pool;
