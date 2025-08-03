import pool from "./db.js";

const createTables = async () => {
  try {
    // === Products tablosu ===
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

    // === Fiyat logları ===
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

    // === Ürün detayları ===
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

    // === Ürün özellikleri ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS product_attributes (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        attribute_name TEXT NOT NULL,
        attribute_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === Kullanıcılar tablosu ===
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);

    // === İndeksler ===
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);

    // === Admin user ===
    await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, role) 
      VALUES (
        'admin@admin.com',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj86.klVpVjO',
        'Admin',
        'User',
        'admin'
      )
      ON CONFLICT (email) DO NOTHING;
    `);

    console.log("✅ Veritabanı tabloları başarıyla oluşturuldu.");
  } catch (err) {
    console.error("❌ Tablolar oluşturulurken hata:", err);
  }
};

export default createTables;
