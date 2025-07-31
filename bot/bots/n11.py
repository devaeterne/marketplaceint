from dotenv import load_dotenv
load_dotenv()

import os
import time
import re
from urllib.parse import quote_plus
from datetime import datetime
import psycopg2
import undetected_chromedriver as uc
from bs4 import BeautifulSoup

# PostgreSQL bağlantısı
conn = psycopg2.connect(
    host=os.getenv("PG_HOST", "localhost"),
    port=int(os.getenv("PG_PORT", 5432)),
    dbname=os.getenv("PG_DB", "marketplace"),
    user=os.getenv("PG_USER", "postgres"),
    password=os.getenv("PG_PASS", "postgres")
)
conn.autocommit = True

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
    return cur.fetchone()[0]

def insert_price_log(cur, product_id, price, campaign_price, stock_status):
    cur.execute("""
        INSERT INTO product_price_logs (product_id, price, campaign_price, stock_status)
        VALUES (%s, %s, %s, %s);
    """, (product_id, price, campaign_price, stock_status))

def run_n11_bot():
    print("🟡 N11 bot başlatıldı...")

    options = uc.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-gpu")
    options.add_argument("--window-size=1920,1080")
    # M1 Mac için ek seçenekler
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-plugins")
    options.add_argument("--disable-images")
    options.add_argument("--no-first-run")
    options.add_argument("--disable-default-apps")
    options.add_argument("--single-process")  # M1 için önemli

    # M1 Mac (ARM64) için Chromium kullan
    try:
        # Docker container içinde Chromium kullan
        driver = uc.Chrome(
            options=options,
            browser_executable_path="/usr/bin/chromium",
            driver_executable_path="/usr/bin/chromedriver"
        )
    except Exception as e:
        print(f"❌ Chromium ile başlatma hatası: {e}")
        # Fallback: sistem default Chrome/Chromium
        try:
            driver = uc.Chrome(options=options)
        except Exception as e2:
            print(f"❌ Fallback Chrome hatası: {e2}")
            return

    with open("search_terms/terms.txt", "r", encoding="utf-8") as f:
        search_terms = [line.strip() for line in f if line.strip()]

    with conn.cursor() as cur:
        for term in search_terms:
            print(f"🔍 '{term}' aranıyor...")
            encoded_term = quote_plus(term)

            seen_product_ids = set()

            for page in range(1, 6):
                url = f"https://www.n11.com/arama?q={encoded_term}&srt=PRICE_LOW&pg={page}"
                print(f"🔗 Sayfa: {url}")
                
                try:
                    driver.get(url)
                    time.sleep(4)
                except Exception as e:
                    print(f"❌ Sayfa yükleme hatası: {e}")
                    continue

                soup = BeautifulSoup(driver.page_source, "html.parser")
                items = soup.select("div.productArea li.column")

                if not items:
                    print(f"⚠️ Sayfa {page} boş.")
                    debug_path = f"debug_n11_{term.lower().replace(' ', '_')}_sayfa{page}.html"
                    with open(debug_path, "w", encoding="utf-8") as f:
                        f.write(driver.page_source)
                    print(f"📝 Debug HTML kaydedildi: {debug_path}")
                    break

                for item in items:
                    try:
                        link_tag = item.select_one("a.plink")
                        if not link_tag:
                            continue

                        product_id = link_tag.get("data-id")
                        if product_id in seen_product_ids:
                            continue
                        seen_product_ids.add(product_id)

                        product_link = link_tag["href"]
                        title = item.select_one("h3.productName").text.strip()
                        brand_input = item.find("input", class_="sellerNickName")
                        brand = brand_input["value"] if brand_input else None

                        price_span = item.select_one("span.newPrice ins")
                        raw_price = price_span.text.strip() if price_span else "0"
                        clean_price = raw_price.replace("TL", "").replace(".", "").replace(",", ".").strip()

                        try:
                            price = float(clean_price)
                        except:
                            price = 0.0

                        product_db_id = upsert_product(cur, "n11", product_id, product_link, title, brand)
                        insert_price_log(cur, product_db_id, price, None, "Kontrol edilecek")

                    except Exception as e:
                        print(f"❌ Ürün işleme hatası: {e}")

    driver.quit()
    print("✅ N11 bot tamamlandı.")

if __name__ == "__main__":
    run_n11_bot()