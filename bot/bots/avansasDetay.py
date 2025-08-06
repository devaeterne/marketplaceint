# bots/avansasDetay.py

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
import logging
import os
from db_connection import get_db_connection

# === Loglama ayarları ===
base_dir = os.path.dirname(os.path.abspath(__file__))  # /app/bots gibi tam path
log_dir = os.path.join(base_dir, "..", "bot_logs")
os.makedirs(log_dir, exist_ok=True)

log_path = os.path.join(log_dir, "avansas-detail_latest.log")
log_dir = "bot_logs"


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_path, encoding="utf-8"),
        logging.StreamHandler()  # konsola da yaz
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

# === Selenium ayarları ===
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
    # Ürünleri çek
    cursor.execute("""
        SELECT id, product_link 
        FROM products 
        WHERE platform = 'avansas' AND product_link IS NOT NULL
        ORDER BY id
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
                # Sayfayı yükle
                driver.get(url)
                logger.info("⏳ Sayfa yükleniyor...")
                
                # Sayfanın tam yüklenmesini bekle
                wait = WebDriverWait(driver, 15)
                wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                time.sleep(3)  # Ek bekleme
                
                # Sayfa kaynağını al
                page_source = driver.page_source
                soup = BeautifulSoup(page_source, "html.parser")
                logger.info("✅ Sayfa başarıyla yüklendi")

                # === Açıklama (description) ===
                desc_div = soup.select_one("div.product-description-tab.tab-description")
                description = str(desc_div) if desc_div else None
                logger.info(f"📝 Açıklama: {'Bulundu' if description else 'Bulunamadı'}")

                # === Sabit değerler ===
                store_name = "Avansas"
                store_rating = 0.0

                # === Kargo bilgisi ===
                shipping_div = soup.select_one("div.delivery-detail-button a")
                shipping_info = shipping_div.get_text(strip=True) if shipping_div else None
                logger.info(f"🚚 Kargo bilgisi: {shipping_info or 'Bulunamadı'}")

                # === Ürün puanı ===
                rating_span = soup.select_one("div.product-detail-review span.review-overall")
                rating = 0.0
                if rating_span:
                    try:
                        rating_text = rating_span.get_text(strip=True).replace(",", ".")
                        rating = float(rating_text)
                        logger.info(f"⭐ Ürün puanı: {rating}")
                    except Exception as e:
                        logger.warning(f"⚠️ Puan parse edilemedi: {e}")

                # === Görsel URL ===
                image_url = None
                image_selectors = [
                    "div.product-detail-media-list img",
                    "div.product-image img",
                    "img.product-detail-image",
                    "div.swiper-slide img"
                ]
                
                for selector in image_selectors:
                    image_tag = soup.select_one(selector)
                    if image_tag:
                        image_url = image_tag.get("src") or image_tag.get("data-src")
                        if image_url:
                            logger.info(f"🖼️ Görsel URL: {image_url}")
                            break
                
                if not image_url:
                    logger.warning("⚠️ Görsel URL bulunamadı")

                # === Ürün Tipi (product_type) ===
                product_type = None
                breadcrumb_items = soup.select("ul.breadcrumb li")
                
                if len(breadcrumb_items) >= 2:
                    second_last = breadcrumb_items[-2]
                    span = second_last.select_one("span")
                    if span:
                        product_type = span.get_text(strip=True)
                        logger.info(f"🏷️ Ürün tipi: {product_type}")
                else:
                    logger.warning("⚠️ Breadcrumb'da yeterli öğe yok")

                # === Veritabanına kaydet ===
                now = datetime.now()
                free_shipping = True

                cursor.execute("""
                    INSERT INTO product_details 
                        (product_id, description, store_name, shipping_info, free_shipping, 
                         rating, product_type, created_at, updated_at, image_url, store_rating)
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
                """, (product_id, description, store_name, shipping_info, free_shipping, 
                      rating, product_type, now, now, image_url, store_rating))

                # Özellikleri temizle (Avansas'ta genelde özellik yok)
                cursor.execute("DELETE FROM product_attributes WHERE product_id = %s", (product_id,))

                conn.commit()
                processed_count += 1
                logger.info(f"✅ Product ID {product_id} başarıyla güncellendi")

            except Exception as e:
                error_count += 1
                error_products.append({
                    'product_id': product_id,
                    'url': url,
                    'error': str(e)
                })
                logger.error(f"❌ Product ID {product_id} işlenirken hata:")
                logger.error(f"Hata detayı: {str(e)}")
                logger.error(f"Stack trace:\n{traceback.format_exc()}")
                
                # Hata durumunda rollback yap
                conn.rollback()
                
                # Kritik hata kontrolü
                if "chrome not reachable" in str(e).lower():
                    logger.error("🚨 Chrome erişilemiyor, bot durduruluyor!")
                    break
                    
                continue

except Exception as e:
    logger.error(f"🚨 Genel hata: {e}")
    logger.error(f"Stack trace:\n{traceback.format_exc()}")

finally:
    # Özet rapor
    logger.info(f"\n{'='*60}")
    logger.info("📊 ÖZET RAPOR")
    logger.info(f"✅ Başarıyla işlenen: {processed_count}")
    logger.info(f"❌ Hatalı: {error_count}")
    logger.info(f"📈 Toplam: {processed_count + error_count}")
    
    if error_products:
        logger.info("\n❌ HATALI ÜRÜNLER:")
        for error_product in error_products[:10]:  # İlk 10 hatayı göster
            logger.info(f"- Product ID: {error_product['product_id']}")
            logger.info(f"  URL: {error_product['url']}")
            logger.info(f"  Hata: {error_product['error']}")
    
    # Temizlik
    try:
        driver.quit()
        logger.info("✅ Chrome driver kapatıldı")
    except:
        logger.warning("⚠️ Chrome driver kapatılamadı")
    
    try:
        cursor.close()
        conn.close()
        logger.info("✅ Veritabanı bağlantısı kapatıldı")
    except:
        logger.warning("⚠️ Veritabanı bağlantısı kapatılamadı")
    
    logger.info(f"\n🎉 Avansas detay botu tamamlandı!")
    