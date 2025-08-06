# bots/n11detay.py

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import re
import traceback
from datetime import datetime
from db_connection import get_db_connection
import logging
import os

# === Loglama ayarları ===
base_dir = os.path.dirname(os.path.abspath(__file__))
log_dir = os.path.join(base_dir, "..", "bot_logs")
os.makedirs(log_dir, exist_ok=True)

log_path = os.path.join(log_dir, "n11-detail_latest.log")

# Logger ayarla
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_path, mode='w', encoding="utf-8"),  # Her seferinde üzerine yaz
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# === PostgreSQL bağlantısı ===
try:
    conn = get_db_connection()
    logger.info("✅ Veritabanı bağlantısı başarılı")
except Exception as e:
    logger.error(f"❌ Veritabanı bağlantı hatası: {e}")
    raise

# İstatistikleri takip et
processed_count = 0
error_count = 0
error_products = []

def setup_chrome_driver():
    """Chrome driver'ı ayarla ve başlat"""
    try:
        options = uc.ChromeOptions()
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        
        driver = uc.Chrome(
            options=options,
            browser_executable_path="/usr/bin/chromium",
            driver_executable_path="/usr/bin/chromedriver"
        )
        logger.info("✅ Chrome driver başlatıldı")
        return driver
    except Exception as e:
        logger.error(f"❌ Chrome driver başlatma hatası: {e}")
        return None

def extract_product_details(driver, url, product_id):
    """Ürün detaylarını çıkar"""
    try:
        driver.get(url)
        logger.info("⏳ Sayfa yükleniyor...")
        
        WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
        time.sleep(2)
        
        soup = BeautifulSoup(driver.page_source, "html.parser")
        logger.info("✅ Sayfa başarıyla yüklendi")

        # === Açıklama ===
        desc_elem = soup.select_one(".unf-info-context .unf-info-desc")
        description = desc_elem.get_text(strip=True) if desc_elem else ""
        logger.info(f"📝 Açıklama: {'Bulundu' if description else 'Bulunamadı'}")

        # === Mağaza bilgileri ===
        store_elem = soup.select_one(".unf-p-seller-name")
        store_name = store_elem.get_text(strip=True) if store_elem else ""
        logger.info(f"🏪 Mağaza: {store_name or 'Bulunamadı'}")

        # === Mağaza puanı ===
        store_rating = 0.0
        rating_span = soup.select_one(".point")
        if rating_span:
            try:
                rating_text = rating_span.get_text(strip=True).replace(",", ".")
                store_rating = float(re.findall(r"\d+\.?\d*", rating_text)[0])
                logger.info(f"⭐ Mağaza puanı: {store_rating}")
            except Exception as e:
                logger.warning(f"⚠️ Mağaza puanı parse edilemedi: {e}")

        # === Kargo bilgisi ===
        shipping_info = ""
        kargo_elem = soup.select_one(".cargo") or soup.select_one(".cargo-new")
        if kargo_elem:
            shipping_info = kargo_elem.get_text(strip=True)
            logger.info(f"🚚 Kargo: {shipping_info}")
        else:
            logger.warning("⚠️ Kargo bilgisi bulunamadı")

        free_shipping = "ücretsiz" in shipping_info.lower()
        logger.info(f"📦 Ücretsiz kargo: {'Evet' if free_shipping else 'Hayır'}")

        # === Ürün puanı ===
        rating = None
        rating_elem = soup.select_one(".ratingScore")
        if rating_elem:
            try:
                rating = float(rating_elem.get_text(strip=True).replace(",", "."))
                logger.info(f"⭐ Ürün puanı: {rating}")
            except Exception as e:
                logger.warning(f"⚠️ Ürün puanı parse edilemedi: {e}")

        # === Kategori ===
        category = ""
        breadcrumb = soup.select("#breadCrumb ul li a")
        if len(breadcrumb) >= 2:
            category = breadcrumb[-2].get_text(strip=True)
            logger.info(f"🏷️ Kategori: {category}")
        else:
            logger.warning("⚠️ Kategori bulunamadı")

        # === Görsel URL ===
        image_url = ""
        image_selectors = [
            ".unf-p-img-box-big img",
            ".imgObj img",
            ".product-image img",
            ".proDetailCarousel img"
        ]
        
        for selector in image_selectors:
            image_container = soup.select_one(selector)
            if image_container:
                image_url = (image_container.get("src") or 
                           image_container.get("data-src") or 
                           image_container.get("data-original"))
                if image_url:
                    logger.info(f"🖼️ Görsel URL: {image_url}")
                    break
        
        if not image_url:
            logger.warning("⚠️ Görsel URL bulunamadı")

        details = {
            "description": description,
            "store_name": store_name,
            "shipping_info": shipping_info,
            "free_shipping": free_shipping,
            "rating": rating,
            "product_type": category,
            "image_url": image_url or "Görsel bulunamadı",
            "store_rating": store_rating
        }

        # === Ürün özellikleri ===
        attributes = {}
        
        # Yeni stil özellik listesi
        rows = soup.select(".unf-prop-list .unf-prop-list-item")
        for row in rows:
            name = row.select_one(".unf-prop-list-title")
            value = row.select_one(".unf-prop-list-prop")
            if name and value:
                attributes[name.get_text(strip=True)] = value.get_text(strip=True)

        # Eski stil tablo özellikleri
        tables = soup.select(".productFeatures table tr, .specifications table tr")
        for row in tables:
            cells = row.select("td")
            if len(cells) >= 2:
                key = cells[0].get_text(strip=True)
                val = cells[1].get_text(strip=True)
                if key and val:
                    attributes[key] = val

        logger.info(f"📋 {len(attributes)} özellik bulundu")
        return details, attributes

    except Exception as e:
        logger.error(f"❌ Ürün detayları çıkarılırken hata: {e}")
        logger.error(f"Stack trace:\n{traceback.format_exc()}")
        raise

def insert_product_detail(cur, product_id, details):
    """Ürün detaylarını veritabanına ekle"""
    try:
        cur.execute("""
            INSERT INTO product_details (product_id, description, store_name, shipping_info, 
                                       free_shipping, rating, product_type, image_url, 
                                       store_rating, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (product_id) DO UPDATE
            SET description = EXCLUDED.description,
                store_name = EXCLUDED.store_name,
                shipping_info = EXCLUDED.shipping_info,
                free_shipping = EXCLUDED.free_shipping,
                rating = EXCLUDED.rating,
                product_type = EXCLUDED.product_type,
                image_url = EXCLUDED.image_url,
                store_rating = EXCLUDED.store_rating,
                updated_at = NOW();
        """, (
            product_id,
            details['description'],
            details['store_name'],
            details['shipping_info'],
            details['free_shipping'],
            details['rating'],
            details['product_type'],
            details['image_url'],
            details['store_rating']
        ))
        logger.info("✅ Ürün detayları kaydedildi")
    except Exception as e:
        logger.error(f"❌ Ürün detayları kaydedilirken hata: {e}")
        raise

def insert_product_attributes(cur, product_id, attributes):
    """Ürün özelliklerini veritabanına ekle"""
    try:
        cur.execute("DELETE FROM product_attributes WHERE product_id = %s", (product_id,))
        
        for key, value in attributes.items():
            cur.execute("""
                INSERT INTO product_attributes (product_id, attribute_name, attribute_value, created_at)
                VALUES (%s, %s, %s, NOW());
            """, (product_id, key, value))
        
        logger.info(f"✅ {len(attributes)} özellik kaydedildi")
    except Exception as e:
        logger.error(f"❌ Ürün özellikleri kaydedilirken hata: {e}")
        raise

def run_n11_detay_bot():
    """Ana bot fonksiyonu"""
    global processed_count, error_count, error_products
    
    logger.info("🚀 n11 detay botu başlatılıyor...")
    
    driver = setup_chrome_driver()
    if not driver:
        logger.error("❌ Chrome başlatılamadı, bot sonlandırılıyor")
        return

    try:
        with conn.cursor() as cur:
            # Detayı alınmamış ürünleri çek
            cur.execute("""
                SELECT id, product_link FROM products
        WHERE platform = 'n11'
          AND product_link IS NOT NULL
        ORDER BY id;
            """)
            products = cur.fetchall()
            total_products = len(products)
            
            logger.info(f"📊 Toplam {total_products} ürün bulundu")

            if not products:
                logger.warning("⚠️ İşlenecek ürün bulunamadı")
                return

            for index, row in enumerate(products, 1):
                pid = row['id']
                url = row['product_link']

                logger.info(f"\n{'='*60}")
                logger.info(f"🔍 İşleniyor [{index}/{total_products}]: Product ID {pid}")
                logger.info(f"📌 URL: {url}")

                try:
                    if not url or not url.startswith("http"):
                        logger.warning(f"⚠️ Geçersiz URL atlandı: {url}")
                        continue

                    details, attributes = extract_product_details(driver, url, pid)
                    insert_product_detail(cur, pid, details)
                    insert_product_attributes(cur, pid, attributes)
                    conn.commit()
                    
                    processed_count += 1
                    logger.info(f"✅ Product ID {pid} başarıyla güncellendi")
                    
                    # Rate limiting
                    time.sleep(2)
                    
                except Exception as e:
                    error_count += 1
                    error_products.append({
                        'product_id': pid,
                        'url': url,
                        'error': str(e)
                    })
                    logger.error(f"❌ Product ID {pid} işlenirken hata: {e}")
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
            conn.close()
            logger.info("✅ Veritabanı bağlantısı kapatıldı")
        except:
            logger.warning("⚠️ Veritabanı bağlantısı kapatılamadı")
        
        logger.info(f"\n🎉 n11 detay botu tamamlandı!")

if __name__ == "__main__":
    run_n11_detay_bot()