import db from "./db.js";

async function createTables() {
  try {
    // === USERS ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR UNIQUE NOT NULL,
        password_hash VARCHAR NOT NULL,
        first_name VARCHAR,
        last_name VARCHAR,
        role VARCHAR DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
      );
    `);

    // === SEARCH TERMS ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS search_terms (
        id SERIAL PRIMARY KEY,
        term TEXT NOT NULL,
        count INTEGER DEFAULT 0,
        platform TEXT NOT NULL,
        UNIQUE (term, platform)
      );
    `);

    // === PRODUCTS ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        platform TEXT NOT NULL,
        platform_product_id TEXT NOT NULL,
        product_link TEXT,
        title TEXT,
        brand TEXT,
        normalized_title TEXT,
        normalized_brand TEXT,
        search_term_id INTEGER REFERENCES search_terms(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (platform, platform_product_id)
      );
    `);

    // === PRODUCT PRICE LOGS ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_price_logs (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        price NUMERIC,
        campaign_price NUMERIC,
        stock_status TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === PRODUCT DETAILS ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_details (
        product_id INTEGER PRIMARY KEY REFERENCES products(id),
        description TEXT,
        store_name TEXT,
        shipping_info TEXT,
        free_shipping BOOLEAN,
        rating NUMERIC,
        product_type TEXT,
        normalized_type TEXT,
        image_url TEXT,
        store_rating NUMERIC DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === PRODUCT ATTRIBUTES ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_attributes (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        attribute_name TEXT NOT NULL,
        attribute_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (product_id, attribute_name)
      );
    `);

    // === PRODUCT MATCH GROUPS ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_match_groups (
        id SERIAL PRIMARY KEY,
        group_name TEXT,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === PRODUCT MATCHES ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS product_matches (
        id SERIAL PRIMARY KEY,
        product_id INTEGER REFERENCES products(id),
        group_id INTEGER REFERENCES product_match_groups(id),
        similarity_score NUMERIC,
        matching_method TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (product_id, group_id)
      );
    `);

    // === BOT RUN LOGS ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS bot_run_logs (
        id SERIAL PRIMARY KEY,
        bot_name TEXT,
        status TEXT,
        search_term TEXT,
        result_count INTEGER,
        duration_seconds INTEGER,
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === NOTIFICATIONS ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        type TEXT,
        message TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === AUDIT LOGS ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action TEXT,
        entity_type TEXT,
        entity_id INTEGER,
        old_value JSONB,
        new_value JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // === STANDARD CATEGORIES ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS standard_categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        parent_id INTEGER REFERENCES standard_categories(id)
      );
    `);

    // === PLATFORM CATEGORY MAPPINGS ===
    await db.query(`
      CREATE TABLE IF NOT EXISTS platform_category_mappings (
        id SERIAL PRIMARY KEY,
        platform TEXT NOT NULL,
        platform_category_name TEXT NOT NULL,
        standard_category_id INTEGER REFERENCES standard_categories(id),
        UNIQUE (platform, platform_category_name)
      );
    `);

    console.log(
      "✅ Tüm tablolar ve unique constraint'ler başarıyla oluşturuldu."
    );
  } catch (err) {
    console.error("🚨 Tablolar oluşturulurken hata oluştu:", err);
  }
}

export default createTables;
