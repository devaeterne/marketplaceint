"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

var _db = _interopRequireDefault(require("./db.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

function createTables() {
  return regeneratorRuntime.async(function createTables$(_context) {
    while (1) {
      switch (_context.prev = _context.next) {
        case 0:
          _context.prev = 0;
          _context.next = 3;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS users (\n    id SERIAL PRIMARY KEY,\n    email VARCHAR UNIQUE NOT NULL,\n    password_hash VARCHAR NOT NULL,\n    first_name VARCHAR,\n    last_name VARCHAR,\n    role VARCHAR DEFAULT 'user',\n    is_active BOOLEAN DEFAULT true,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    last_login TIMESTAMP,\n    phone VARCHAR(20),\n    bio TEXT,\n    position VARCHAR(100),\n    location VARCHAR(200),\n    avatar TEXT,\n    facebook_url TEXT,\n    twitter_url TEXT,\n    linkedin_url TEXT,\n    instagram_url TEXT\n    "));

        case 3:
          _context.next = 5;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS search_terms (\n        id SERIAL PRIMARY KEY,\n        term TEXT NOT NULL,\n        count INTEGER DEFAULT 0,\n        platform TEXT NOT NULL,\n        UNIQUE (term, platform)\n      );\n    "));

        case 5:
          _context.next = 7;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS products (\n        id SERIAL PRIMARY KEY,\n        platform TEXT NOT NULL,\n        platform_product_id TEXT NOT NULL,\n        product_link TEXT,\n        title TEXT,\n        brand TEXT,\n        normalized_title TEXT,\n        normalized_brand TEXT,\n        search_term_id INTEGER REFERENCES search_terms(id),\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        UNIQUE (platform, platform_product_id)\n      );\n    "));

        case 7:
          _context.next = 9;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS product_price_logs (\n        id SERIAL PRIMARY KEY,\n        product_id INTEGER REFERENCES products(id),\n        price NUMERIC,\n        campaign_price NUMERIC,\n        stock_status TEXT,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      );\n    "));

        case 9:
          _context.next = 11;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS product_details (\n        product_id INTEGER PRIMARY KEY REFERENCES products(id),\n        description TEXT,\n        store_name TEXT,\n        shipping_info TEXT,\n        free_shipping BOOLEAN,\n        rating NUMERIC,\n        product_type TEXT,\n        normalized_type TEXT,\n        image_url TEXT,\n        store_rating NUMERIC DEFAULT 0,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      );\n    "));

        case 11:
          _context.next = 13;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS product_attributes (\n        id SERIAL PRIMARY KEY,\n        product_id INTEGER REFERENCES products(id),\n        attribute_name TEXT NOT NULL,\n        attribute_value TEXT,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        UNIQUE (product_id, attribute_name)\n      );\n    "));

        case 13:
          _context.next = 15;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS product_match_groups (\n        id SERIAL PRIMARY KEY,\n        group_name TEXT,\n        created_by INTEGER REFERENCES users(id),\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      );\n    "));

        case 15:
          _context.next = 17;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS product_matches (\n        id SERIAL PRIMARY KEY,\n        product_id INTEGER REFERENCES products(id),\n        group_id INTEGER REFERENCES product_match_groups(id),\n        similarity_score NUMERIC,\n        matching_method TEXT,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n        UNIQUE (product_id, group_id)\n      );\n    "));

        case 17:
          _context.next = 19;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS final_products (\n    id SERIAL PRIMARY KEY,\n    name TEXT NOT NULL,\n    short_description TEXT,\n    description TEXT,\n    image_url TEXT,\n    image_file TEXT,\n    brand TEXT,\n    brand_id TEXT,\n    category TEXT,\n    category_id TEXT,\n    weight NUMERIC,\n    total_stock NUMERIC DEFAULT 0,\n    max_quantity_per_cart INTEGER,\n    google_taxonomy_id TEXT,\n    product_option_set_id TEXT,\n    product_volume_discount_id TEXT,\n    base_unit TEXT,\n    sales_channel_ids TEXT[][],\n    hidden_sales_channel_ids TEXT[][],\n    tag_ids TEXT[][],\n    ikas_product_id TEXT,\n    price NUMERIC,\n    campaign_price NUMERIC,\n    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,\n    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      );\n    "));

        case 19:
          _context.next = 21;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS final_product_matches (\n        id SERIAL PRIMARY KEY,\n        final_product_id INTEGER REFERENCES final_products(id),\n        product_id INTEGER REFERENCES products(id),\n        match_group_id INTEGER REFERENCES product_match_groups(id),\n        matched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      );\n    "));

        case 21:
          _context.next = 23;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS bot_run_logs (\n        id SERIAL PRIMARY KEY,\n        bot_name TEXT,\n        status TEXT,\n        search_term TEXT,\n        result_count INTEGER,\n        duration_seconds INTEGER,\n        error_message TEXT,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      );\n    "));

        case 23:
          _context.next = 25;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS notifications (\n        id SERIAL PRIMARY KEY,\n        user_id INTEGER REFERENCES users(id),\n        type TEXT,\n        message TEXT,\n        is_read BOOLEAN DEFAULT false,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      );\n    "));

        case 25:
          _context.next = 27;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS audit_logs (\n        id SERIAL PRIMARY KEY,\n        user_id INTEGER REFERENCES users(id),\n        action TEXT,\n        entity_type TEXT,\n        entity_id INTEGER,\n        old_value JSONB,\n        new_value JSONB,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      );\n    "));

        case 27:
          _context.next = 29;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS standard_categories (\n        id SERIAL PRIMARY KEY,\n        name TEXT NOT NULL,\n        parent_id INTEGER REFERENCES standard_categories(id)\n      );\n    "));

        case 29:
          _context.next = 31;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS platform_category_mappings (\n        id SERIAL PRIMARY KEY,\n        platform TEXT NOT NULL,\n        platform_category_name TEXT NOT NULL,\n        standard_category_id INTEGER REFERENCES standard_categories(id),\n        UNIQUE (platform, platform_category_name)\n      );\n    "));

        case 31:
          _context.next = 33;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS product_categories (\n        id SERIAL PRIMARY KEY,\n        name TEXT NOT NULL,\n        ikas_category_id TEXT,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      );\n    "));

        case 33:
          _context.next = 35;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS product_tags (\n        id SERIAL PRIMARY KEY,\n        name TEXT NOT NULL,\n        ikas_tag_id TEXT,\n        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP\n      );\n    "));

        case 35:
          _context.next = 37;
          return regeneratorRuntime.awrap(_db["default"].query("\n      CREATE TABLE IF NOT EXISTS final_product_tags (\n        final_product_id INTEGER REFERENCES final_products(id),\n        tag_id INTEGER REFERENCES product_tags(id),\n        PRIMARY KEY (final_product_id, tag_id)\n      );\n    "));

        case 37:
          console.log("✅ Tüm tablolar ve unique constraint'ler başarıyla oluşturuldu.");
          _context.next = 43;
          break;

        case 40:
          _context.prev = 40;
          _context.t0 = _context["catch"](0);
          console.error("🚨 Tablolar oluşturulurken hata oluştu:", _context.t0);

        case 43:
        case "end":
          return _context.stop();
      }
    }
  }, null, null, [[0, 40]]);
}

var _default = createTables;
exports["default"] = _default;