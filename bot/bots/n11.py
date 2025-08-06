# bots/n11.py

from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import undetected_chromedriver as uc
import time
from urllib.parse import quote_plus
from db_connection import get_db_connection
import logging
import os
import traceback
from datetime import datetime

# === Loglama ayarları ===
base_dir = os.path.dirname(os.path.abspath(__file__))
log_dir = os.path.join(base_dir, "..", "bot_logs")
os.makedirs(log_dir, exist_ok=True)

log_path = os.path.join(log_dir, "n11_latest.log")

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
total_processed = 0
total_errors = 0
error_products = []

def upsert_product(cur, platform, platform_product_id, product_link, title, brand):
    """Ürünü products tablosuna ekle veya güncelle"""
    try:
        cur.execute("""
            INSERT INTO products (platform, platform_product_id, product_link, title, brand)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (platform, platform_product_id) DO UPDATE
            SET product_link = EXCLUDED.product_link,
                title = EXCLUDED.title,
                brand = EXCLUDED.brand,
                updated_at = NOW()
            RETURNING id;
        """, (platform, platform_product_id, product_link, title, brand))

        result = cur.fetchone()
        if not result:
            logger.warning(f"⚠️ fetchone() None döndü - {platform_product_id}")
            return None

        if isinstance(result, dict) and 'id' in result:
            return result['id']
        elif isinstance(result, (tuple, list)):
            return result[0]
        else:
            logger.warning(f"⚠️ fetchone() beklenmeyen formatta - {result}")
            return None
    except Exception as e:
        logger.error(f"❌ Ürün ekleme hatası: {e}")
        raise

def setup_chrome_driver():
    """Chrome driver'ı ayarla ve döndür"""
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

def insert_price_log(cur, product_id, price, campaign_price, stock_status):
    """Fiyat bilgisini product_price_logs tablosuna ekle"""
    try:
        cur.execute("""
            INSERT INTO product_price_logs (product_id, price, campaign_price, stock_status, created_at)
            VALUES (%s, %s, %s, %s, NOW());
        """, (product_id, price, campaign_price, stock_status))
        logger.debug(f"💰 Fiyat log eklendi: {price} TL (Kampanya: {campaign_price} TL)")
    except Exception as e:
        logger.error(f"❌ Fiyat log ekleme hatası: {e}")
        raise

def run_n11_bot():
    global total_processed, total_errors, error_products
    
    logger.info("🚀 N11 bot başlatıldı...")
    logger.info(f"📅 Tarih: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Chrome driver'ı ayarla
    driver = setup_chrome_driver()
    if not driver:
        logger.error("❌ Chrome driver başlatılamadı!")
        return
        
    wait = WebDriverWait(driver, 10)

    # Arama terimlerini yükle
    terms_file = "search_terms/terms.txt"
    if not os.path.exists(terms_file):
        # Alternatif path dene
        terms_file = "/app/search_terms/terms.txt"
    
    try:
        with open(terms_file, "r", encoding="utf-8") as f:
            search_terms = [line.strip() for line in f if line.strip()]
        logger.info(f"📋 {len(search_terms)} arama terimi yüklendi")
    except Exception as e:
        logger.error(f"❌ Arama terimleri yüklenemedi: {e}")
        return

    try:
        with conn.cursor() as cur:
            for term_index, term in enumerate(search_terms, 1):
                logger.info(f"\n{'='*60}")
                logger.info(f"🔍 [{term_index}/{len(search_terms)}] '{term}' için ürünler çekiliyor...")
                encoded_term = quote_plus(term)
                term_product_count = 0
                previous_product_links = set()

                for page in range(1, 6):  # Max 5 sayfa
                    try:
                        url = f"https://www.n11.com/arama?q={encoded_term}&srt=PRICE_LOW&pg={page}"
                        logger.info(f"📄 Sayfa {page} URL: {url}")
                        driver.get(url)

                        # Sayfanın yüklenmesini bekle
                        try:
                            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div.productArea")))
                            time.sleep(2)  # Ek bekleme
                        except Exception as e:
                            logger.warning(f"⚠️ Sayfa {page} yüklenemedi: {e}")
                            break

                        soup = BeautifulSoup(driver.page_source, "html.parser")

                        # Pagination kontrolü
                        pagination = soup.select_one("div.paginationArea")
                        if page > 1 and not pagination:
                            logger.info(f"📊 Sayfa {page} için pagination yok, son sayfa")
                            break

                        # Ürünleri bul
                        product_items = soup.select("div.productArea li.column")
                        if not product_items:
                            logger.warning(f"⚠️ Sayfa {page} içinde ürün bulunamadı")
                            break

                        logger.info(f"📦 {len(product_items)} ürün bulundu")

                        # Tekrar kontrolü için linkleri topla
                        current_links = set()
                        for item in product_items:
                            a_tag = item.select_one("a.plink")
                            if a_tag and "href" in a_tag.attrs:
                                current_links.add(a_tag["href"])

                        # Ürün linkleri tekrar mı kontrolü
                        if current_links.issubset(previous_product_links):
                            logger.warning(f"⚠️ Sayfa {page} ürünleri tekrar ediyor")
                            break

                        previous_product_links.update(current_links)

                        # Her ürünü işle
                        for item_index, item in enumerate(product_items, 1):
                            try:
                                # Link ve ID
                                a_tag = item.select_one("a.plink")
                                if not a_tag:
                                    continue
                                    
                                urun_linki = a_tag.get("href", "")
                                product_id = a_tag.get("data-id", "")
                                
                                # URL'yi tamamla
                                if urun_linki and not urun_linki.startswith("http"):
                                    urun_linki = "https://www.n11.com" + urun_linki
                                
                                # Başlık
                                title_elem = item.select_one("h3.productName")
                                title = title_elem.get_text(strip=True) if title_elem else "Başlık bulunamadı"
                                
                                # Marka
                                marka_input = item.find("input", {"class": "sellerNickName"})
                                marka = marka_input.get("value", "") if marka_input else "Bilinmeyen"
                                
                                # Fiyat
                                fiyat_span = item.select_one("span.newPrice ins")
                                if fiyat_span:
                                    fiyat_raw = fiyat_span.get_text(strip=True)
                                    fiyat_clean = fiyat_raw.replace("TL", "").replace(".", "").replace(",", ".").strip()
                                    try:
                                        fiyat = float(fiyat_clean)
                                    except:
                                        fiyat = 0.0
                                else:
                                    fiyat = 0.0

                                # Stok durumu
                                item_text = item.get_text().lower()
                                stock_status = "Tükendi" if any(word in item_text for word in ["tükendi", "stokta yok", "mevcut değil"]) else "Mevcut"

                                # Veritabanına kaydet
                                if product_id and product_id != "Yok":
                                    product_db_id = upsert_product(
                                        cur, 
                                        "n11",
                                        product_id,
                                        urun_linki,
                                        title,
                                        marka
                                    )

                                    if product_db_id:
                                        insert_price_log(
                                            cur,
                                            product_db_id,
                                            fiyat,
                                            None,  # campaign_price
                                            stock_status
                                        )
                                        term_product_count += 1
                                        total_processed += 1
                                        logger.info(f"✅ [{item_index}/{len(product_items)}] {title[:50]}... - {fiyat} TL")
                                    else:
                                        logger.error(f"❌ DB ID alınamadı: {product_id}")
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

                        # Her sayfa sonrası commit
                        conn.commit()
                        logger.info(f"💾 Sayfa {page} kaydedildi - Bu sayfada {len(product_items)} ürün işlendi")

                    except Exception as e:
                        logger.error(f"❌ Sayfa {page} genel hatası: {e}")
                        logger.debug(f"Stack trace:\n{traceback.format_exc()}")
                        continue

                logger.info(f"🎯 '{term}' için toplam {term_product_count} ürün işlendi")

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
        
        logger.info(f"🎉 N11 bot tamamlandı! (Süre: {datetime.now().strftime('%H:%M:%S')})")

if __name__ == "__main__":
    run_n11_bot()