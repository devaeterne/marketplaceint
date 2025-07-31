import pkg from "pg";
const { Pool } = pkg;

const pool = new Pool({
  host: process.env.PG_HOST || "db",
  port: parseInt(process.env.PG_PORT) || 5432,
  database: process.env.PG_DB || "ikasdb",
  user: process.env.PG_USER || "ikasuser",
  password: process.env.PG_PASS || "ikaspass",
});

export default pool;
