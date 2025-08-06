# bots/trendyolDetay.py

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from bs4 import BeautifulSoup
from datetime import datetime
import os
import time
import traceback
import logging
from db_connection import get_db_connection

# === Loglama ayarları ===
base_dir = os.path.dirname(os.path.abspath(__file__))
log_dir = os.path.join(base_dir, "..", "bot_logs")
os.makedirs(log_dir, exist_ok=True)

log_path = os.path.join(log_dir, "trendyol-detail_latest.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_path, mode='w', encoding="utf-8"),
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

# İstatistikleri takip et
processed_count = 0
error_count = 0
error_products = []

# === Selenium Ayarları ===
try:
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
    wait = WebDriverWait(driver, 15)
    logger.info("✅ Chrome driver başlatıldı")
except Exception as e:
    logger.error(f"❌ Chrome driver başlatma hatası: {e}")
    raise

try:
    # Detayı alınmamış ürünleri çek
    cursor.execute("""
        SELECT id, product_link 
        FROM products 
        WHERE platform = 'trendyol' 
        AND product_link IS NOT NULL
        AND NOT EXISTS (
            SELECT 1 FROM product_details WHERE product_details.product_id = products.id
        )
        ORDER BY created_at DESC
    """)
    urunler = cursor.fetchall()
    total_products = len(urunler)
    
    logger.info(f"📊 Toplam {total_products} ürün bulundu")

    if not urunler:
        logger.warning("⚠️ İşlenecek ürün bulunamadı")
    else:
        for index, row in enumerate(urunler, 1):
            # RealDictRow kontrolü
            if isinstance(row, dict):
                product_id = row.get("id")
                url = row.get("product_link")
            elif isinstance(row, (list, tuple)) and len(row) == 2:
                product_id, url = row
            else:
                logger.warning(f"⚠️ Beklenmeyen veri yapısı: {row}")
                continue

            if not url or not isinstance(url, str) or not url.startswith("http"):
                logger.warning(f"❌ Geçersiz URL atlandı → Product ID: {product_id}, URL: {url}")
                continue

            logger.info(f"\n{'='*60}")
            logger.info(f"🔍 İşleniyor [{index}/{total_products}]: Product ID {product_id}")
            logger.info(f"📌 URL: {url}")

            try:
                driver.get(url)
                logger.info("⏳ Sayfa yükleniyor...")
                
                # Sayfanın yüklenmesini bekle
                wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                time.sleep(3)

                soup = BeautifulSoup(driver.page_source, "html.parser")
                logger.info("✅ Sayfa başarıyla yüklendi")

                # === Açıklama ===
                description_items = soup.select("ul.content-descriptions-description-content li")
                description = " ".join([li.get_text(strip=True) for li in description_items]) if description_items else None
                logger.info(f"📝 Açıklama: {'Bulundu' if description else 'Bulunamadı'}")

                # === Mağaza Adı ===
                store_name_tag = soup.select_one("div.merchant-name")
                store_name = store_name_tag.get_text(strip=True) if store_name_tag else None
                logger.info(f"🏪 Mağaza: {store_name or 'Bulunamadı'}")

                # === Kargo Bilgileri ===                
                shipping_tag = soup.select_one("div.delivery-container")
                shipping_info = shipping_tag.get_text(" ", strip=True) if shipping_tag else None
                free_shipping = True
                logger.info(f"🚚 Kargo: {shipping_info or 'Bulunamadı'}")

                # === Ürün Puanı ===
                rating = 0.0
                rating_tag = soup.select_one("span.reviews-summary-average-rating")
                if rating_tag:
                    try:
                        rating = float(rating_tag.get_text(strip=True).replace(",", "."))
                        logger.info(f"⭐ Ürün puanı: {rating}")
                    except Exception as e:
                        logger.warning(f"⚠️ Ürün puanı parse edilemedi: {e}")

                # === Ürün Tipi (Kategori) ===
                product_type = None
                breadcrumb_items = soup.select("ul.breadcrumb-list li.product-detail-new-breadcrumbs-item a")
                if len(breadcrumb_items) >= 2:
                    product_type = breadcrumb_items[-2].get_text(strip=True)
                    logger.info(f"🏷️ Kategori: {product_type}")
                else:
                    logger.warning("⚠️ Kategori bulunamadı")

                # === Görsel URL ===
                image_url = None
                image_selectors = [
                    'img[data-testid="image"]',
                    '.gallery-modal-content img',
                    '.product-slide-image img',
                    '.product-image-container img'
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

                # === Mağaza Puanı ===
                store_rating = 0.0
                store_rating_tag = soup.select_one("div.score-badge")
                if store_rating_tag:
                    try:
                        store_rating = float(store_rating_tag.get_text(strip=True).replace(",", "."))
                        logger.info(f"⭐ Mağaza puanı: {store_rating}")
                    except Exception as e:
                        logger.warning(f"⚠️ Mağaza puanı parse edilemedi: {e}")

                # === Veritabanına kaydet ===
                now = datetime.now()

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

                # === Ürün özellikleri ===
                cursor.execute("DELETE FROM product_attributes WHERE product_id = %s", (product_id,))
                
                attribute_count = 0
                attribute_items = soup.select("div.attribute-item")
                
                # Tekrar eden özellikleri önlemek için set kullan
                processed_attributes = set()
                
                for attr in attribute_items:
                    name_div = attr.select_one("div.name")
                    value_div = attr.select_one("div.value")
                    if name_div and value_div:
                        attr_name = name_div.get_text(strip=True)
                        attr_value = value_div.get_text(strip=True)
                        
                        # Aynı isimli özellik daha önce eklendiyse, atla
                        if attr_name in processed_attributes:
                            logger.warning(f"⚠️ Tekrar eden özellik atlandı: {attr_name}")
                            continue
                        
                        try:
                            cursor.execute("""
                                INSERT INTO product_attributes (product_id, attribute_name, attribute_value, created_at)
                                VALUES (%s, %s, %s, NOW())
                                ON CONFLICT (product_id, attribute_name) DO UPDATE
                                SET attribute_value = EXCLUDED.attribute_value,
                                    created_at = NOW()
                            """, (product_id, attr_name, attr_value))
                            processed_attributes.add(attr_name)
                            attribute_count += 1
                        except Exception as e:
                            logger.error(f"❌ Özellik eklenirken hata: {attr_name} - {e}")
                            continue

                logger.info(f"📋 {attribute_count} özellik bulundu ve kaydedildi")

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
                logger.error(f"❌ Product ID {product_id} işlenirken hata: {e}")
                logger.error(f"Stack trace:\n{traceback.format_exc()}")
                
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
        for error_product in error_products[:10]:
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
    
    logger.info(f"\n🎉 Trendyol detay botu tamamlandı!")