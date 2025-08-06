from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
from datetime import datetime
import traceback
import time
from db_connection import get_db_connection
import json
import logging
import os

# === PostgreSQL bağlantısı ===
conn = get_db_connection()
cursor = conn.cursor()
log_dir = "bot_logs"
os.makedirs(log_dir, exist_ok=True)
log_path = os.path.join(log_dir, "avansas-detail_latest.log")  # veya f"{bot_name}_latest.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_path, encoding="utf-8"),
        logging.StreamHandler()  # konsola da yaz
    ]
)
# === Selenium Ayarları ===
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--window-size=1920,1080")
chrome_options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36")

driver = webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=chrome_options)

try:
    cursor.execute("""
        SELECT id, product_link 
        FROM products 
        WHERE platform = 'hepsiburada' AND product_link IS NOT NULL
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

                # === Açıklama ===
                desc_div = soup.select_one("div.productDescriptionContent")
                description = desc_div.get_text(" ", strip=True) if desc_div else None

                # === Mağaza Adı (store_name)
                try:
                    store_elem = WebDriverWait(driver, 5).until(
                        EC.presence_of_element_located((By.XPATH, "//*[@id='container']/main/div/div[2]/section[1]/div[2]/div[2]/div[1]/a"))
                )
                    store_name = store_elem.text.strip()
                except Exception:
                    store_name = None

                 # === Mağaza Puanı ===
                rating_span = soup.select_one('span[data-test-id="merchant-rating"]')
                try:
                    store_rating = float(rating_span.get_text(strip=True).replace(",", ".")) if rating_span else 0.0
                except:
                    store_rating = 0.0

                # === Kargo Bilgisi XPath ile (class'lar bozulursa)
                try:
                    shipping_elem = WebDriverWait(driver, 5).until(
                        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Teslimat') or contains(text(), 'teslimat')]/ancestor::div[1]"))
                )
                    shipping_info = shipping_elem.text.strip()
                except Exception:
                    shipping_info = None

                # === Ürün Puanı ===
                rating_tag = soup.select_one("div[data-test-id='has-review'] span")
                try:
                    rating = float(rating_tag.get_text(strip=True).replace(",", ".")) if rating_tag else 0.0
                except:
                    rating = 0.0

                # === Ürün Tipi (product_type) - JSON içinden breadcrumb verisi
                product_type = None
                ld_json_script = soup.find("script", type="application/ld+json")

                if ld_json_script:
                    try:
                        json_data = json.loads(ld_json_script.string)
                        breadcrumb_items = json_data.get("breadcrumb", {}).get("itemListElement", [])
                        if isinstance(breadcrumb_items, list) and len(breadcrumb_items) >= 2:
                            product_type = breadcrumb_items[-2].get("name", None)
                    except Exception as e:
                        print(f"⚠️ Breadcrumb JSON çözümleme hatası: {e}")


                # === Görsel ===
                image_tag = soup.select_one("picture img")
                image_url = image_tag["src"] if image_tag and image_tag.has_attr("src") else None

                # === Sabit değer
                free_shipping = True                
                now = datetime.now()

                # === Detayları yaz
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

                # === Özellikleri temizle ve yeniden yaz
                cursor.execute("DELETE FROM product_attributes WHERE product_id = %s", (product_id,))
                attribute_items = soup.select("div.attribute-item")
                for attr in attribute_items:
                    name_div = attr.select_one("div.name")
                    value_div = attr.select_one("div.value")
                    if name_div and value_div:
                        name = name_div.get_text(strip=True)
                        value = value_div.get_text(strip=True)
                        cursor.execute("""
                            INSERT INTO product_attributes (product_id, attribute_name, attribute_value)
                            VALUES (%s, %s, %s)
                        """, (product_id, name, value))

                conn.commit()
                print(f"✅ Product ID {product_id} güncellendi.")

            except Exception:
                print(f"❌ HATA:\n{traceback.format_exc()}")
                continue

finally:
    driver.quit()
    cursor.close()
    conn.close()
    print("🎉 Hepsiburada detay işlemi tamamlandı.")
