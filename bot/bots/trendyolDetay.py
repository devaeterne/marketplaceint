from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from datetime import datetime
import os
import time
from db_connection import get_db_connection

# PostgreSQL bağlantısı - .env'den dinamik çekiliyor
conn = get_db_connection()
cursor = conn.cursor()

# === Selenium Ayarları ===
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--window-size=1920,1080")
chrome_options.add_argument(
    "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36"
)

driver = webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=chrome_options)

try:
    cursor.execute("""
        SELECT id, product_link 
        FROM products 
        WHERE platform = 'trendyol' AND product_link IS NOT NULL
    """)
    urunler = cursor.fetchall()

    print(f"📊 Toplam {len(urunler)} Trendyol ürünü bulundu")

    for product_id, url in urunler:
        print(f"🔎 İşleniyor: Product ID {product_id} → {url}")
        
        try:
            driver.get(url)
            time.sleep(3)

            soup = BeautifulSoup(driver.page_source, "html.parser")

            # Açıklama
            description_tag = soup.select_one("div.content-description")
            description = description_tag.get_text(strip=True) if description_tag else None

            # Mağaza Adı
            store_tag = soup.select_one("button.content-description-popover-item-button div")
            store_name = store_tag.get_text(strip=True) if store_tag else None

            # Kargo Bilgisi
            shipping_tag = soup.select_one("div.promotion-box-item div.title p")
            shipping_info = shipping_tag.get_text(strip=True) if shipping_tag else None
            free_shipping = "bedava" in (shipping_info or "").lower()

            # Puan
            rating_tag = soup.select_one("span.reviews-summary-average-rating")
            rating = float(rating_tag.get_text(strip=True).replace(",", ".")) if rating_tag else None

            # Ürün Türü (breadcrumb)
            breadcrumb_items = soup.select("ul.breadcrumb-list li.product-detail-new-breadcrumbs-item a")
            product_type = breadcrumb_items[-2].get_text(strip=True) if len(breadcrumb_items) >= 2 else None

            now = datetime.now()

            # Ürün detayını kaydet
            cursor.execute("""
                INSERT INTO product_details 
                    (product_id, description, store_name, shipping_info, free_shipping, rating, product_type, created_at)
                VALUES 
                    (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (product_id) DO UPDATE SET
                    description = EXCLUDED.description,
                    store_name = EXCLUDED.store_name,
                    shipping_info = EXCLUDED.shipping_info,
                    free_shipping = EXCLUDED.free_shipping,
                    rating = EXCLUDED.rating,
                    product_type = EXCLUDED.product_type,
                    updated_at = NOW();
            """, (product_id, description, store_name, shipping_info, free_shipping, rating, product_type, now))

            # Önceki attribute kayıtlarını sil (çakışmasın)
            cursor.execute("DELETE FROM product_attributes WHERE product_id = %s", (product_id,))

            # Ürün özelliklerini kaydet
            attribute_items = soup.select("div.attribute-item")
            for attr in attribute_items:
                name_div = attr.select_one("div.name")
                value_div = attr.select_one("div.value")
                if name_div and value_div:
                    attr_name = name_div.get_text(strip=True)
                    attr_value = value_div.get_text(strip=True)
                    cursor.execute("""
                        INSERT INTO product_attributes (product_id, attribute_name, attribute_value)
                        VALUES (%s, %s, %s)
                    """, (product_id, attr_name, attr_value))

            conn.commit()
            print(f"✅ Product ID {product_id} detayları ve özellikleri eklendi/güncellendi.")
            
        except Exception as e:
            print(f"❌ Product ID {product_id} işlenirken hata: {e}")
            continue

finally:
    driver.quit()
    cursor.close()
    conn.close()
    print("🎉 Trendyol detay işlemi tamamlandı.")