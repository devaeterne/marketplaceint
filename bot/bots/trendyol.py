# bots/trendyol.py

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import time
from urllib.parse import quote_plus
import os
import traceback
import logging
from datetime import datetime
from db_connection import get_db_connection

# === Loglama ayarları ===
base_dir = os.path.dirname(os.path.abspath(__file__))
log_dir = os.path.join(base_dir, "..", "bot_logs")
os.makedirs(log_dir, exist_ok=True)

log_path = os.path.join(log_dir, "trendyol_latest.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_path, mode='w', encoding="utf-8"),  # Her seferinde üzerine yaz
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# İstatistikleri takip et
total_processed = 0
total_errors = 0
error_products = []

def get_driver():
    """Chrome driver'ı ayarla ve başlat"""
    try:
        chrome_options = Options()
        chrome_options.add_argument("--headless")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--window-size=1920,1080")
        chrome_options.add_argument(
            "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/115.0.0.0 Safari/537.36"
        )
        driver = webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=chrome_options)
        logger.info("✅ Chrome driver başlatıldı")
        return driver
    except Exception as e:
        logger.error(f"❌ Chrome driver başlatma hatası: {e}")
        return None

def clean_price(value):
    """Fiyat değerini temizle ve float'a çevir"""
    if not value:
        return 0.0
    try:
        cleaned = value.replace("TL", "").replace(".", "").replace(",", ".").strip()
        return float(cleaned)
    except Exception as e:
        logger.warning(f"⚠️ Fiyat parse edilemedi: {value} - {e}")
        return 0.0

def upsert_product(cur, platform, platform_product_id, product_link, title, brand):
    """Ürünü veritabanına ekle veya güncelle, (product_id, is_new) tuple döner"""
    try:
        # Önce var mı diye kontrol et
        cur.execute("""
            SELECT id FROM products
            WHERE platform = %s AND platform_product_id = %s
        """, (platform, platform_product_id))

        result = cur.fetchone()
        if result:
            # Varsa güncelle ve mevcut ID'yi döndür
            product_id = result[0] if isinstance(result, tuple) else result.get('id')
            cur.execute("""
                UPDATE products
                SET product_link = %s,
                    title = %s,
                    brand = %s,
                    updated_at = NOW()
                WHERE platform = %s AND platform_product_id = %s
                RETURNING id
            """, (product_link, title, brand, platform, platform_product_id))
            return (product_id, False)  # (id, is_new=False)
        else:
            # Yoksa ekle ve yeni ID'yi döndür
            cur.execute("""
                INSERT INTO products (platform, platform_product_id, product_link, title, brand)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
            """, (platform, platform_product_id, product_link, title, brand))
            
            new_result = cur.fetchone()
            if new_result:
                product_id = new_result[0] if isinstance(new_result, tuple) else new_result.get('id')
                return (product_id, True)  # (id, is_new=True)
            else:
                logger.error("❌ Yeni ürün eklendi ama ID alınamadı")
                return (None, False)
                
    except Exception as e:
        logger.error(f"❌ Ürün ekleme hatası: {e}")
        raise

def insert_price_log(cur, product_id, price, campaign_price, stock_status):
    """Fiyat logunu ekle"""
    try:
        cur.execute("""
            INSERT INTO product_price_logs (product_id, price, campaign_price, stock_status, created_at)
            VALUES (%s, %s, %s, %s, NOW());
        """, (product_id, price, campaign_price, stock_status))
        logger.debug(f"💰 Fiyat log eklendi: {price} TL (Kampanya: {campaign_price} TL)")
    except Exception as e:
        logger.error(f"❌ Fiyat log ekleme hatası: {e}")
        raise

def increment_search_term_count(cur, term, new_product_count):
    """Arama terimi için bulunan yeni ürün sayısını ekle"""
    try:
        # İlk kayıtta direkt new_product_count değerini yaz
        # Sonraki güncellemelerde mevcut değere ekle
        cur.execute("""
            INSERT INTO search_terms (term, platform, count)
            VALUES (%s, %s, %s)
            ON CONFLICT (term, platform)
            DO UPDATE SET count = search_terms.count + %s
        """, (term, "trendyol", new_product_count, new_product_count))
        
        # Güncel count değerini öğren
        cur.execute("""
            SELECT count FROM search_terms 
            WHERE term = %s AND platform = %s
        """, (term, "trendyol"))
        
        result = cur.fetchone()
        current_count = result[0] if result else new_product_count
        
        logger.info(f"📊 '{term}' terimi için +{new_product_count} yeni ürün (Toplam: {current_count})")
    except Exception as e:
        logger.warning(f"⚠️ search_terms güncellenemedi: {e}")
        
def run_trendyol_bot():
    global total_processed, total_errors, error_products
    
    logger.info("🚀 Trendyol bot başlatıldı...")
    logger.info(f"📅 Tarih: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Arama terimlerini yükle
    terms_file = "/app/search_terms/terms.txt"
    if not os.path.exists(terms_file):
        terms_file = "search_terms/terms.txt"  # Alternatif path
    
    if not os.path.exists(terms_file):
        logger.error("❌ terms.txt dosyası bulunamadı!")
        return

    try:
        with open(terms_file, "r", encoding="utf-8") as f:
            search_terms = [line.strip() for line in f if line.strip()]
        logger.info(f"📋 {len(search_terms)} arama terimi yüklendi")
    except Exception as e:
        logger.error(f"❌ Arama terimleri yüklenemedi: {e}")
        return

    if not search_terms:
        logger.error("❌ Arama terimi bulunamadı!")
        return

    # Chrome driver'ı başlat
    driver = get_driver()
    if not driver:
        return

    # Veritabanı bağlantısı
    try:
        conn = get_db_connection()
        logger.info("✅ Veritabanı bağlantısı başarılı")
    except Exception as e:
        logger.error(f"❌ Veritabanı bağlantı hatası: {e}")
        driver.quit()
        return

    try:
        with conn.cursor() as cur:
            for term_index, term in enumerate(search_terms, 1):
                logger.info(f"\n{'='*60}")
                logger.info(f"🔍 [{term_index}/{len(search_terms)}] '{term}' için ürünler çekiliyor...")
                encoded_term = quote_plus(term)
                term_product_count = 0
                new_products_count = 0  # Bu terim için yeni ürün sayısı

                for page in range(1, 6):  # Max 5 sayfa
                    try:
                        url = f"https://www.trendyol.com/sr?q={encoded_term}&os=1&sst=PRICE_BY_ASC&pi={page}"
                        logger.info(f"📄 Sayfa {page} URL: {url}")

                        driver.get(url)
                        time.sleep(5)  # Sayfanın yüklenmesini bekle

                        soup = BeautifulSoup(driver.page_source, "html.parser")
                        products = soup.find_all("div", class_="p-card-wrppr")

                        if not products:
                            logger.warning(f"⚠️ Sayfa {page} için ürün bulunamadı")
                            break

                        logger.info(f"📦 Sayfa {page}'da {len(products)} ürün bulundu")

                        for product_index, product in enumerate(products, 1):
                            try:
                                # Ürün ID
                                product_id = product.get("data-id")
                                if not product_id:
                                    logger.warning("⚠️ Ürün ID bulunamadı, atlanıyor")
                                    continue

                                # Marka ve başlık
                                brand_tag = product.select_one(".prdct-desc-cntnr-ttl")
                                title_tag = product.select_one(".prdct-desc-cntnr-name")

                                brand = brand_tag.get_text(strip=True) if brand_tag else "Bilinmeyen"
                                title = title_tag.get_text(strip=True) if title_tag else "Başlıksız"

                                # Ürün linki
                                link_tag = product.find("a", href=True)
                                product_link = "https://www.trendyol.com" + link_tag["href"] if link_tag else None

                                if not product_link:
                                    logger.warning(f"⚠️ Ürün linki bulunamadı: {product_id}")
                                    continue

                                # Fiyat bilgisi
                                price_info = product.find("div", class_="price-information")
                                if not price_info:
                                    logger.warning(f"⚠️ Fiyat konteyneri bulunamadı: {product_id}")
                                    continue

                                # Kampanya fiyatı
                                campaign_tag = price_info.select_one(
                                    ".price-item.lowest-price-discounted, "
                                    ".price-item.basket-price-original, "
                                    ".price-item.discounted, "
                                    ".price-item.basket-price-discounted"
                                )

                                # Normal fiyat
                                price_tag = price_info.select_one(
                                    ".price-item:not(.lowest-price-discounted)"
                                    ":not(.basket-price-original)"
                                    ":not(.discounted)"
                                    ":not(.basket-price-discounted)"
                                )

                                campaign_price = clean_price(campaign_tag.get_text(strip=True)) if campaign_tag else 0.0
                                price = clean_price(price_tag.get_text(strip=True)) if price_tag else campaign_price

                                # Kargo bilgisi
                                delivery_div = product.find("div", class_="rushDelivery")
                                stock_status = "Yarın kargoda" if delivery_div else "2 gün içinde kargoda"

                                logger.debug(f"📝 Ürün: {title[:30]}... - Fiyat: {price} TL")

                                # Veritabanına kaydet
                                product_db_id, is_new = upsert_product(cur, "trendyol", product_id, product_link, title, brand)
                                
                                if product_db_id:
                                    insert_price_log(cur, product_db_id, price, campaign_price, stock_status)
                                    conn.commit()
                                    term_product_count += 1
                                    total_processed += 1
                                    
                                    if is_new:
                                        new_products_count += 1
                                        logger.info(f"🆕 [{product_index}/{len(products)}] YENİ ÜRÜN: {title[:50]}... - {campaign_price or price} TL")
                                    else:
                                        logger.info(f"✅ [{product_index}/{len(products)}] {title[:50]}... - {campaign_price or price} TL")
                                else:
                                    logger.error(f"❌ DB ID alınamadı: {product_id}")
                                    total_errors += 1

                            except Exception as e:
                                total_errors += 1
                                error_products.append({
                                    'term': term,
                                    'page': page,
                                    'product_id': product_id if 'product_id' in locals() else 'Unknown',
                                    'error': str(e)
                                })
                                logger.error(f"❌ Ürün işleme hatası: {e}")
                                logger.debug(f"Stack trace:\n{traceback.format_exc()}")
                                continue

                        logger.info(f"💾 Sayfa {page} tamamlandı")

                    except Exception as e:
                        logger.error(f"❌ Sayfa {page} yükleme hatası: {e}")
                        logger.debug(f"Stack trace:\n{traceback.format_exc()}")
                        continue

                # Bu terim için özet
                logger.info(f"🎯 '{term}' için toplam {term_product_count} ürün işlendi ({new_products_count} yeni)")
                
                # Eğer bu terim için en az 1 yeni ürün eklendiyse, search_terms tablosunu güncelle
                if new_products_count > 0:
                    increment_search_term_count(cur, term, new_products_count)
                    conn.commit()
                    logger.info(f"📈 '{term}' için search_terms sayacı güncellendi (+{new_products_count} yeni ürün)")

    except Exception as e:
        logger.error(f"🚨 Genel bot hatası: {e}")
        logger.error(f"Stack trace:\n{traceback.format_exc()}")

    finally:
        # Özet rapor
        logger.info(f"\n{'='*60}")
        logger.info("📊 ÖZET RAPOR")
        logger.info(f"✅ Toplam işlenen ürün: {total_processed}")
        logger.info(f"❌ Toplam hata: {total_errors}")
        logger.info(f"📈 Başarı oranı: {(total_processed/(total_processed+total_errors)*100 if (total_processed+total_errors) > 0 else 0):.1f}%")
        
        if error_products:
            logger.info("\n❌ HATA DETAYLARI (İlk 10):")
            for error in error_products[:10]:
                logger.info(f"- Terim: {error['term']}, Sayfa: {error['page']}, ID: {error.get('product_id', 'N/A')}")
                logger.info(f"  Hata: {error['error']}")
        
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
        
        logger.info(f"🎉 Trendyol bot tamamlandı! (Süre: {datetime.now().strftime('%H:%M:%S')})")

if __name__ == "__main__":
    run_trendyol_bot()