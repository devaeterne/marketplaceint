import pool from "./db.js";

const createTables = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        platform TEXT NOT NULL,
        platform_product_id TEXT NOT NULL,
        product_link TEXT,
        title TEXT,
        brand TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (platform, platform_product_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_price_logs (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        price NUMERIC,
        campaign_price NUMERIC,
        stock_status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
  CREATE TABLE IF NOT EXISTS product_details (
    id SERIAL PRIMARY KEY,
    product_id INTEGER UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    description TEXT,
    store_name TEXT,
    shipping_info TEXT,
    free_shipping BOOLEAN,
    rating NUMERIC,
    product_type TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );
`);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_attributes (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        attribute_name TEXT NOT NULL,
        attribute_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log("✅ Veritabanı tabloları başarıyla oluşturuldu.");
  } catch (err) {
    console.error("❌ Tablolar oluşturulurken hata:", err);
  }
};

export default createTables;
