# bots/hepsiburada.py

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
from urllib.parse import quote_plus
from datetime import datetime
import time
import os
import re
import traceback
import logging
from db_connection import get_db_connection

# === Log ayarları ===
base_dir = os.path.dirname(os.path.abspath(__file__))
log_dir = os.path.join(base_dir, "..", "bot_logs")
os.makedirs(log_dir, exist_ok=True)

log_path = os.path.join(log_dir, "hepsiburada_latest.log")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_path, mode='w', encoding="utf-8"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# İstatistikleri takip et
total_processed = 0
total_errors = 0
error_products = []

# === Yardımcı Fonksiyonlar ===
def clean_price(raw):
    """Fiyat değerini temizle ve float'a çevir"""
    if not raw:
        return 0.0
    try:
        cleaned = raw.replace("TL", "").replace(".", "").replace(",", ".").strip()
        return float(cleaned)
    except Exception as e:
        logger.warning(f"⚠️ Fiyat parse edilemedi: {raw} - {e}")
        return 0.0

def extract_product_id_from_url(url):
    """URL'den ürün ID'sini çıkar"""
    try:
        return url.split("-")[-1]
    except:
        return None

def get_driver():
    """Chrome driver'ı ayarla ve başlat"""
    try:
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--disable-gpu")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36")
        driver = webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=options)
        logger.info("✅ Chrome driver başlatıldı")
        return driver
    except Exception as e:
        logger.error(f"❌ Chrome driver başlatma hatası: {e}")
        return None

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
            VALUES (%s, %s, %s, %s, NOW())
        """, (product_id, price, campaign_price, stock_status))
        logger.debug(f"💰 Fiyat log eklendi: {price} TL (Kampanya: {campaign_price} TL)")
    except Exception as e:
        logger.error(f"❌ Fiyat log ekleme hatası: {e}")
        raise

def increment_search_term_count(cur, term, new_product_count):
    """Arama terimi için bulunan yeni ürün sayısını ekle"""
    try:
        cur.execute("""
            INSERT INTO search_terms (term, platform, count)
            VALUES (%s, %s, %s)
            ON CONFLICT (term, platform)
            DO UPDATE SET count = search_terms.count + %s
        """, (term, "hepsiburada", new_product_count, new_product_count))
        
        # Güncel count değerini öğren
        cur.execute("""
            SELECT count FROM search_terms 
            WHERE term = %s AND platform = %s
        """, (term, "hepsiburada"))
        
        result = cur.fetchone()
        current_count = result[0] if result else new_product_count
        
        logger.info(f"📊 '{term}' terimi için +{new_product_count} yeni ürün (Toplam: {current_count})")
    except Exception as e:
        logger.warning(f"⚠️ search_terms güncellenemedi: {e}")

# === Ana Bot Fonksiyonu ===
def run_hepsiburada_bot():
    global total_processed, total_errors, error_products
    
    logger.info("🚀 Hepsiburada bot başlatıldı...")
    logger.info(f"📅 Tarih: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Arama terimlerini yükle
    terms_file = "/app/search_terms/terms.txt"
    if not os.path.exists(terms_file):
        terms_file = "search_terms/terms.txt"  # Alternatif path
        
    if not os.path.exists(terms_file):
        logger.error("❌ terms.txt dosyası bulunamadı.")
        return

    try:
        with open(terms_file, "r", encoding="utf-8") as f:
            search_terms = [line.strip() for line in f if line.strip()]
        logger.info(f"📋 {len(search_terms)} arama terimi yüklendi")
    except Exception as e:
        logger.error(f"❌ Arama terimleri yüklenemedi: {e}")
        return

    if not search_terms:
        logger.warning("⚠️ Arama terimi bulunamadı.")
        return

    # Chrome driver'ı başlat
    driver = get_driver()
    if not driver:
        return

    # Veritabanı bağlantısı
    try:
        conn = get_db_connection()
        logger.info("✅ Veritabanı bağlantısı başarılı.")
    except Exception as e:
        logger.error(f"❌ Veritabanı bağlantı hatası: {e}")
        driver.quit()
        return

    try:
        with conn.cursor() as cur:
            for term_index, term in enumerate(search_terms, 1):
                logger.info(f"\n{'='*60}")
                logger.info(f"🔍 [{term_index}/{len(search_terms)}] '{term}' için ürünler çekiliyor...")
                encoded = quote_plus(term)
                term_product_count = 0
                new_products_count = 0  # Bu terim için yeni ürün sayısı

                for page in range(1, 6):  # Max 5 sayfa
                    try:
                        url = f"https://www.hepsiburada.com/ara?q={encoded}&siralama=artanfiyat&sayfa={page}"
                        logger.info(f"📄 Sayfa {page} URL: {url}")

                        driver.get(url)
                        time.sleep(5)
                        
                        soup = BeautifulSoup(driver.page_source, "html.parser")
                        product_cards = soup.find_all("li", class_=re.compile("productListContent-"))

                        if not product_cards:
                            logger.warning(f"⚠️ Sayfa {page} için ürün bulunamadı")
                            break

                        logger.info(f"📦 Sayfa {page}'da {len(product_cards)} ürün bulundu")
                        
                        for card_index, card in enumerate(product_cards, 1):
                            try:
                                title_tag = card.find("h2", class_=re.compile("title-module_titleRoot"))
                                if not title_tag:
                                    continue

                                title = title_tag.get_text(strip=True)
                                brand_span = title_tag.find("span", class_=re.compile("title-module_brandText"))
                                brand = brand_span.get_text(strip=True) if brand_span else "Belirtilmemiş"

                                a_tag = card.find("a", href=True)
                                product_url = "https://www.hepsiburada.com" + a_tag["href"] if a_tag else None
                                platform_product_id = extract_product_id_from_url(a_tag["href"]) if a_tag else None

                                if not product_url or not platform_product_id:
                                    logger.warning("⚠️ Geçersiz ürün atlandı.")
                                    continue

                                # Fiyatlar
                                final_price_div = card.find("div", class_=re.compile(r"(^|\s)price-module_finalPrice__"))
                                final_price = clean_price(final_price_div.get_text(strip=True)) if final_price_div else 0.0

                                original_price_div = card.find("div", class_=re.compile(r"(^|\s)price-module_originalPrice__"))
                                original_price = clean_price(original_price_div.get_text(strip=True)) if original_price_div else final_price

                                # Kargo bilgisi
                                kargo_div = card.find("div", class_=re.compile("estimatedArrivalDate"))
                                stock_status = kargo_div.get_text(strip=True).replace("Teslimat bilgisi:", "").strip() if kargo_div else "Belirsiz"

                                logger.debug(f"📝 Ürün: {title[:30]}... - Fiyat: {final_price} TL")

                                # Veritabanına kaydet
                                product_db_id, is_new = upsert_product(cur, "hepsiburada", platform_product_id, product_url, title, brand)
                                
                                if product_db_id:
                                    insert_price_log(cur, product_db_id, original_price, final_price, stock_status)
                                    conn.commit()
                                    term_product_count += 1
                                    total_processed += 1
                                    
                                    if is_new:
                                        new_products_count += 1
                                        logger.info(f"🆕 [{card_index}/{len(product_cards)}] YENİ ÜRÜN: {title[:50]}... - {final_price} TL")
                                    else:
                                        logger.info(f"✅ [{card_index}/{len(product_cards)}] {title[:50]}... - {final_price} TL")
                                else:
                                    logger.error(f"❌ DB ID alınamadı: {platform_product_id}")
                                    total_errors += 1

                            except Exception as e:
                                total_errors += 1
                                error_products.append({
                                    'term': term,
                                    'page': page,
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
                logger.info(f"- Terim: {error['term']}, Sayfa: {error['page']}")
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
        
        logger.info(f"🎉 Hepsiburada bot tamamlandı! (Süre: {datetime.now().strftime('%H:%M:%S')})")

if __name__ == "__main__":
    run_hepsiburada_bot()