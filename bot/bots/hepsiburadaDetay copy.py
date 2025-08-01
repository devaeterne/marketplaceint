from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from datetime import datetime
import os
import time
import traceback
from db_connection import get_db_connection

# === Yardımcı: Debug HTML Kaydet ===
def save_debug_html(driver, product_id):
    debug_dir = "debug"
    os.makedirs(debug_dir, exist_ok=True)
    now = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"debug_{product_id}_{now}.html"
    filepath = os.path.join(debug_dir, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(driver.page_source)
    print(f"🛠 HTML kaydedildi: {filepath}")

# === PostgreSQL bağlantısı ===
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
        WHERE platform = 'hepsiburada' AND product_link IS NOT NULL
    """)
    urunler = cursor.fetchall()

    if not urunler:
        print("⚠️ Veritabanında işlenecek ürün bulunamadı.")
    else:
        for row in urunler:
            if isinstance(row, dict):
                product_id = row.get("id")
                url = row.get("product_link")
            elif isinstance(row, (list, tuple)) and len(row) == 2:
                product_id, url = row
            else:
                print(f"⚠️ Beklenmeyen veri yapısı: {row}")
                continue

            if not url or not isinstance(url, str) or not url.startswith("http"):
                print(f"❌ Geçersiz URL atlandı → Product ID: {product_id}, URL: {url}")
                continue

            print(f"\n🔍 İşleniyor: Product ID {product_id} → {url}")

            try:
                driver.get(url)
                time.sleep(5)
                save_debug_html(driver, product_id)  # ← HTML debug kaydı

                soup = BeautifulSoup(driver.page_source, "html.parser")

                # === Açıklama ===
                desc_items = soup.select("ul.content-descriptions-description-content li")
                description = " ".join([li.get_text(strip=True) for li in desc_items]) if desc_items else None

                # === Mağaza Adı ===
                store_tag = soup.select_one('div[data-test-id="buyBox-seller"] a span')
                store_name = store_tag.get_text(strip=True) if store_tag else None

                # === Mağaza Puanı ===
                rating_span = soup.select_one('span[data-test-id="merchant-rating"]')
                try:
                    store_rating = float(rating_span.get_text(strip=True).replace(",", ".")) if rating_span else 0.0
                except:
                    store_rating = 0.0

                # === Kargo Bilgisi ===
                shipping_tag = soup.select_one('div.delivery-container') or \
                               soup.select_one('div[data-test-id="estimatedDeliveryDate"]')
                shipping_info = shipping_tag.get_text(" ", strip=True) if shipping_tag else None
                free_shipping = "bedava" in (shipping_info or "").lower()

                # === Ürün Puanı ===
                rating_tag = soup.select_one("span.reviews-summary-average-rating")
                try:
                    rating = float(rating_tag.get_text(strip=True).replace(",", ".")) if rating_tag else 0.0
                except:
                    rating = 0.0

                # === Kategori ===
                breadcrumb_items = soup.select("ul.breadcrumb-list li.product-detail-new-breadcrumbs-item a")
                product_type = breadcrumb_items[-2].get_text(strip=True) if len(breadcrumb_items) >= 2 else None

                # === Görsel ===
                image_tag = soup.select_one('img[data-testid="image"]')
                image_url = image_tag["src"] if image_tag and image_tag.has_attr("src") else None

                now = datetime.now()

                # === Detayları veritabanına yaz ===
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

                # === Özellikler: öncekileri sil ve yeniden ekle ===
                cursor.execute("DELETE FROM product_attributes WHERE product_id = %s", (product_id,))
                attributes = soup.select("div.attribute-item")
                for attr in attributes:
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
                print(f"✅ Product ID {product_id} detayları güncellendi.")

            except Exception:
                print(f"❌ Product ID {product_id} işlenirken hata:\n{traceback.format_exc()}")
                continue

finally:
    driver.quit()
    cursor.close()
    conn.close()
    print("🎉 Hepsiburada detay işlemi tamamlandı.")
