# bots/avansas.py

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
from datetime import datetime
import time
import os
import re
import traceback
import logging
from db_connection import get_db_connection

# === Log Ayarı ===
os.makedirs("/app/logs", exist_ok=True)
logging.basicConfig(
    filename="/app/logs/avansas_log.txt",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# === Yardımcı Fonksiyonlar ===

# Veritabanına ürün ekler veya günceller
def upsert_product(cur, platform, platform_product_id, product_link, title, brand):
    cur.execute("""
        INSERT INTO products (platform, platform_product_id, product_link, title, brand)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (platform, platform_product_id) DO UPDATE
        SET product_link = EXCLUDED.product_link,
            title = EXCLUDED.title,
            brand = EXCLUDED.brand,
            updated_at = NOW()
        RETURNING id;
    """, (platform, platform_product_id, product_link, title, brand))

    result = cur.fetchone()
    if not result:
        print(f"⚠️ WARNING: fetchone() None döndü - {platform_product_id}")
        return None

    if isinstance(result, dict) and 'id' in result:
        return result['id']
    elif isinstance(result, (tuple, list)):
        return result[0]
    else:
        print(f"⚠️ WARNING: fetchone() beklenmeyen formatta - {result}")
        return None

# Fiyat log kaydı yapar
def insert_price_log(cur, product_id, price, campaign_price, stock_status):
    cur.execute("""
        INSERT INTO product_price_logs (product_id, price, campaign_price, stock_status, created_at)
        VALUES (%s, %s, %s, %s, NOW())
    """, (product_id, price, campaign_price, stock_status))

# Selenium başlat
def get_driver():
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36")
    return webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=options)

# === Ana Bot Fonksiyonu ===
def run_avansas_bot():
    logging.info("🟡 Avansas bot başlatıldı...")
    print("🟡 Avansas bot başlatıldı...")

    terms_path = "/app/search_terms/terms.txt"
    if not os.path.exists(terms_path):
        logging.error("❌ Arama terimi dosyası bulunamadı.")
        return

    with open(terms_path, "r", encoding="utf-8") as f:
        search_terms = [line.strip() for line in f if line.strip()]

    if not search_terms:
        logging.warning("⚠️ Arama terimi listesi boş.")
        return

    driver = get_driver()
    conn = get_db_connection()
    logging.info("✅ Veritabanı bağlantısı başarılı.")

    with conn:
        with conn.cursor() as cur:
            for term in search_terms:
                encoded_term = quote_plus(term)
                logging.info(f"🔍 Arama: {term}")
                print(f"🔍 Arama: {term}")

                for page in range(1, 6):
                    url = f"https://www.avansas.com/search?q={encoded_term}&sayfa={page}"
                    logging.info(f"🔗 Sayfa {page}: {url}")
                    print(f"🔗 Sayfa {page}: {url}")

                    try:
                        driver.get(url)
                        time.sleep(5)
                        soup = BeautifulSoup(driver.page_source, "html.parser")
                        product_cards = soup.select("div.product-list")

                        if not product_cards:
                            logging.warning(f"⚠️ Sayfa {page} boş geçti.")
                            continue

                        for card in product_cards:
                            try:
                                title = card.get("data-product-name", "").strip()
                                brand = card.get("data-product-brand", "").strip()
                                platform_product_id = card.get("data-product-id", "").strip()
                                product_type = card.get("data-product-category", "").strip()
                                stock_status = "Mevcut"

                                # Ürün bağlantısı
                                a_tag = card.find("a", href=True)
                                product_link = "https://www.avansas.com" + a_tag["href"] if a_tag else None

                                # Fiyatlar (indirim varsa kampanya fiyatı ayrılır)
                                price_div = card.select_one("div.price")
                                campaign_price = price = 0.0

                                if price_div:
                                    current_price_tag = price_div.select_one("span.current-price")
                                    old_price_tag = price_div.select_one("span.strike-through-price")

                                    if current_price_tag:
                                        campaign_price = float(current_price_tag.get_text(strip=True).replace(".", "").replace(",", ".").replace("TL", "").strip())

                                    if old_price_tag:
                                        price = float(old_price_tag.get_text(strip=True).replace(".", "").replace(",", ".").replace("TL", "").strip())
                                    else:
                                        price = campaign_price
                                        campaign_price = None

                                db_id = upsert_product(cur, "avansas", platform_product_id, product_link, title, brand)

                                if db_id:
                                    insert_price_log(cur, db_id, price, campaign_price, stock_status)
                                    conn.commit()
                                    logging.info(f"✅ Ürün işlendi: {title[:60]}... → {campaign_price or price} TL")

                            except Exception:
                                logging.error(f"❌ Ürün işleme hatası:\n{traceback.format_exc()}")
                                continue

                    except Exception:
                        logging.error(f"❌ Sayfa yüklenemedi:\n{traceback.format_exc()}")
                        continue

    driver.quit()
    logging.info("✅ Avansas bot tamamlandı.")
    print("✅ Avansas bot tamamlandı.")

# === Çalıştır ===
if __name__ == "__main__":
    run_avansas_bot()
