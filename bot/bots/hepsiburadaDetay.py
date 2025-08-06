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

# === Loglama ayarları ===
base_dir = os.path.dirname(os.path.abspath(__file__))
log_dir = os.path.join(base_dir, "..", "bot_logs")
os.makedirs(log_dir, exist_ok=True)

log_path = os.path.join(log_dir, "hepsiburada-detail_latest.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_path, encoding="utf-8"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# === PostgreSQL bağlantısı ===
try:
    conn = get_db_connection()
    cursor = conn.cursor()
    logger.info("✅ Veritabanı bağlantısı başarılı")
except Exception as e:
    logger.error(f"❌ Veritabanı bağlantı hatası: {e}")
    raise

# === Selenium Ayarları ===
options = Options()
options.add_argument("--headless")
options.add_argument("--disable-gpu")
options.add_argument("--no-sandbox")
options.add_argument("--disable-dev-shm-usage")
options.add_argument("--window-size=1920,1080")
options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36")

try:
    driver = webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=options)
    logger.info("✅ Chrome driver başlatıldı")
except Exception as e:
    logger.error(f"❌ Chrome driver başlatma hatası: {e}")
    raise

# İşlenen ve hatalı ürünleri takip et
processed_count = 0
error_count = 0
error_products = []

try:
    cursor.execute("""
        SELECT id, product_link 
        FROM products 
        WHERE platform = 'hepsiburada' AND product_link IS NOT NULL
    """)
    products = cursor.fetchall()
    total_products = len(products)
    
    logger.info(f"📊 Toplam {total_products} ürün bulundu")

    if not products:
        logger.warning("⚠️ Veritabanında ürün bulunamadı.")
    else:
        for index, row in enumerate(products, 1):
            product_id, url = row if isinstance(row, (tuple, list)) else (row['id'], row['product_link'])
            
            if not url or not url.startswith("http"):
                logger.warning(f"⚠️ Geçersiz URL (Product ID: {product_id}): {url}")
                continue

            logger.info(f"\n{'='*60}")
            logger.info(f"🔍 İşleniyor [{index}/{total_products}]: Product ID {product_id}")
            logger.info(f"📌 URL: {url}")
            
            try:
                driver.get(url)
                logger.info("⏳ Sayfa yükleniyor...")
                wait = WebDriverWait(driver, 15)
                wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                time.sleep(3)

                soup = BeautifulSoup(driver.page_source, "html.parser")
                logger.info("✅ Sayfa başarıyla yüklendi")

                # Açıklama
                desc_div = soup.select_one("div.productDescriptionContent")
                description = desc_div.get_text(" ", strip=True) if desc_div else None
                logger.info(f"📝 Açıklama: {'Bulundu' if description else 'Bulunamadı'}")

                # Mağaza Adı
                try:
                    store_elem = WebDriverWait(driver, 5).until(
                        EC.presence_of_element_located((By.XPATH, "//*[@id='container']/main/div/div[2]/section[1]/div[2]/div[2]/div[1]/a"))
                    )
                    store_name = store_elem.text.strip()
                except:
                    store_name = None
                logger.info(f"🏪 Mağaza: {store_name or 'Bulunamadı'}")

                # Mağaza Puanı
                rating_span = soup.select_one('span[data-test-id="merchant-rating"]')
                try:
                    store_rating = float(rating_span.get_text(strip=True).replace(",", ".")) if rating_span else 0.0
                except:
                    store_rating = 0.0
                logger.info(f"🏆 Mağaza puanı: {store_rating}")

                # Kargo Bilgisi
                try:
                    shipping_elem = WebDriverWait(driver, 5).until(
                        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Teslimat') or contains(text(), 'teslimat')]/ancestor::div[1]"))
                    )
                    shipping_info = shipping_elem.text.strip()
                except:
                    shipping_info = None
                logger.info(f"🚚 Kargo bilgisi: {shipping_info or 'Bulunamadı'}")

                # Ürün Puanı
                rating_tag = soup.select_one("div[data-test-id='has-review'] span")
                try:
                    rating = float(rating_tag.get_text(strip=True).replace(",", ".")) if rating_tag else 0.0
                except:
                    rating = 0.0
                logger.info(f"⭐ Ürün puanı: {rating}")

                # Ürün Tipi
                product_type = None
                ld_json_script = soup.find("script", type="application/ld+json")
                if ld_json_script:
                    try:
                        json_data = json.loads(ld_json_script.string)
                        breadcrumb_items = json_data.get("breadcrumb", {}).get("itemListElement", [])
                        if isinstance(breadcrumb_items, list) and len(breadcrumb_items) >= 2:
                            product_type = breadcrumb_items[-2].get("name", None)
                    except Exception as e:
                        logger.warning(f"⚠️ Breadcrumb çözümleme hatası: {e}")
                logger.info(f"🏷️ Ürün tipi: {product_type}")

                # Görsel
                image_tag = soup.select_one("picture img")
                image_url = image_tag["src"] if image_tag and image_tag.has_attr("src") else None
                logger.info(f"🖼️ Görsel URL: {image_url or 'Bulunamadı'}")

                # Kaydet
                free_shipping = True                
                now = datetime.now()

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

                # Özellikler
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
                processed_count += 1
                logger.info(f"✅ Product ID {product_id} başarıyla güncellendi")

            except Exception as e:
                error_count += 1
                error_products.append({'product_id': product_id, 'url': url, 'error': str(e)})
                logger.error(f"❌ Hata: {e}")
                logger.error(f"Stack trace:\n{traceback.format_exc()}")
                conn.rollback()
                continue

except Exception as e:
    logger.error(f"🚨 Genel hata: {e}")
    logger.error(f"Stack trace:\n{traceback.format_exc()}")

finally:
    driver.quit()
    cursor.close()
    conn.close()
    logger.info("✅ Veritabanı bağlantısı kapatıldı")
    logger.info(f"\n📊 Özet → Başarılı: {processed_count}, Hatalı: {error_count}, Toplam: {processed_count + error_count}")
    if error_products:
        logger.info("\n❌ Hatalı Ürünler:")
        for err in error_products[:10]:
            logger.info(f"- Product ID: {err['product_id']}, URL: {err['url']}, Hata: {err['error']}")
    logger.info("🎉 Hepsiburada detay botu tamamlandı!")
