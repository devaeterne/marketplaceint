# bots/avansasDetay.py

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from datetime import datetime
import traceback
import time
from db_connection import get_db_connection

# === PostgreSQL bağlantısı ===
conn = get_db_connection()
cursor = conn.cursor()

# === Selenium ayarları ===
options = Options()
options.add_argument("--headless")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--window-size=1920,1080")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36")

driver = webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=options)

try:
    cursor.execute("""
        SELECT id, product_link 
        FROM products 
        WHERE platform = 'avansas' AND product_link IS NOT NULL
    """)
    products = cursor.fetchall()

    if not products:
        print("⚠️ Veritabanında ürün bulunamadı.")
    else:
        for row in products:
            product_id, url = row if isinstance(row, (tuple, list)) else (row['id'], row['product_link'])
            if not url.startswith("http"):
                continue

            print(f"\n🔍 İşleniyor: Product ID {product_id} → {url}")
            try:
                driver.get(url)
                time.sleep(5)
                soup = BeautifulSoup(driver.page_source, "html.parser")

                # === Açıklama (description)
                desc_div = soup.select_one("div.product-description-tab.tab-description")
                description = str(desc_div) if desc_div else None

                # === Mağaza adı sabit: Avansas
                store_name = "Avansas"

                # === Mağaza puanı sabit: 0.0
                store_rating = 0.0

                # === Kargo bilgisi
                shipping_div = soup.select_one("div.delivery-detail-button a")
                shipping_info = shipping_div.get_text(strip=True) if shipping_div else None

                # === Ürün puanı
                rating_span = soup.select_one("div.product-detail-review span.review-overall")
                try:
                    rating = float(rating_span.get_text(strip=True).replace(",", ".")) if rating_span else 0.0
                except:
                    rating = 0.0

                # === Görsel URL
                image_tag = soup.select_one("div.product-detail-media-list img")
                image_url = image_tag.get("src") if image_tag else None

                
                # === Ürün Tipi (product_type) - Breadcrumb sonundan bir önceki eleman
                product_type = None
                breadcrumb_items = soup.select("ul.breadcrumb li")

                if len(breadcrumb_items) >= 2:
                    second_last = breadcrumb_items[-2]
                    span = second_last.select_one("span")
                    if span:
                        product_type = span.get_text(strip=True)


                now = datetime.now()
                free_shipping = True

                # === Detay tablosuna yaz
                cursor.execute("""
                    INSERT INTO product_details 
                        (product_id, description, store_name, shipping_info, free_shipping, rating, product_type, created_at, updated_at, image_url, store_rating)
                    VALUES 
                        (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (product_id) DO UPDATE SET
                        description = EXCLUDED.description,
                        store_name = EXCLUDED.store_name,
                        shipping_info = EXCLUDED.shipping_info,
                        free_shipping = EXCLUDED.free_shipping,
                        rating = EXCLUDED.rating,
                        product_type = EXCLUDED.product_type,
                        updated_at = NOW(),
                        image_url = EXCLUDED.image_url,
                        store_rating = EXCLUDED.store_rating;
                """, (product_id, description, store_name, shipping_info, free_shipping, rating, product_type, now, now, image_url, store_rating))

                # === Özellikleri sil ve yeniden yaz (Avansas'ta özellik listesi genelde yok)
                cursor.execute("DELETE FROM product_attributes WHERE product_id = %s", (product_id,))

                conn.commit()
                print(f"✅ Product ID {product_id} detayları güncellendi.")

            except Exception:
                print(f"❌ HATA:\n{traceback.format_exc()}")
                continue

finally:
    driver.quit()
    cursor.close()
    conn.close()
    print("🎉 Avansas detay botu tamamlandı.")
