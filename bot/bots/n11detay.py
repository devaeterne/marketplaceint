from dotenv import load_dotenv
load_dotenv()

import psycopg2
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from datetime import datetime
import os
import time

# PostgreSQL bağlantısı
conn = psycopg2.connect(
    host=os.getenv("PG_HOST", "localhost"),
    port=int(os.getenv("PG_PORT", 5432)),
    dbname=os.getenv("PG_DB", "marketplace"),
    user=os.getenv("PG_USER", "postgres"),
    password=os.getenv("PG_PASS", "postgres")
)
conn.autocommit = True
cursor = conn.cursor()

# Selenium ayarları
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--window-size=1920,1080")

driver = webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=chrome_options)

try:
    cursor.execute("""
        SELECT id, product_link FROM products
        WHERE platform = 'n11' AND product_link IS NOT NULL
    """)
    urunler = cursor.fetchall()

    for product_id, url in urunler:
        print(f"🔎 {product_id}: {url}")
        driver.get(url)
        time.sleep(3)
        soup = BeautifulSoup(driver.page_source, "html.parser")

        # Fiyat
        price_tag = soup.select_one("div.displayPrice")
        price_text = price_tag.get_text(strip=True).replace("TL", "").replace(".", "").replace(",", ".") if price_tag else "0"
        price = float(price_text) if price_text else None

        # Kampanyalı fiyat
        campaign_tag = soup.select_one("div.newPrice ins")
        campaign_text = campaign_tag.get_text(strip=True).replace("TL", "").replace(".", "").replace(",", ".") if campaign_tag else "0"
        campaign_price = float(campaign_text) if campaign_text else None

        # Mağaza adı
        seller_tag = soup.select_one("a.unf-p-seller-name")
        seller = seller_tag.get_text(strip=True) if seller_tag else None

        # Kargo bilgisi
        kargo_span = soup.select_one("div.cargo-price span.cargoType")
        shipping_info = kargo_span.get_text(strip=True) if kargo_span else None
        free_shipping = "ücretsiz" in (shipping_info or "").lower()

        # Ürün tipi (breadcrumb'dan sondan bir önceki eleman)
        breadcrumb_items = soup.select("div#breadCrumb li a")
        product_type = breadcrumb_items[-2].get_text(strip=True) if len(breadcrumb_items) >= 2 else None

        # Attributes (label + value olarak birleştiriyoruz)
        attribute_pairs = soup.select("div.unf-attribute-label")
        attributes = {
            label.select_one("label").text.strip(): label.select_one("strong").text.strip()
            for label in attribute_pairs if label.select_one("label") and label.select_one("strong")
        }

        now = datetime.now()

        # product_details insert
        cursor.execute("""
            INSERT INTO product_details (product_id, store_name, shipping_info, free_shipping, rating, product_type, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (product_id) DO UPDATE SET
                store_name = EXCLUDED.store_name,
                shipping_info = EXCLUDED.shipping_info,
                free_shipping = EXCLUDED.free_shipping,
                product_type = EXCLUDED.product_type,
                updated_at = EXCLUDED.updated_at;
        """, (product_id, seller, shipping_info, free_shipping, None, product_type, now, now))

        # attributes tablosuna yaz
        for key, value in attributes.items():
            cursor.execute("""
                INSERT INTO product_attributes (product_id, attribute_name, attribute_value, created_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT DO NOTHING;
            """, (product_id, key, value, now))

        conn.commit()
        print(f"✅ {product_id} işlendi.")

finally:
    driver.quit()
    cursor.close()
    conn.close()
    print("🎉 N11 detay işlemi tamamlandı.")
