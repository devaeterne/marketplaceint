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
        logging.FileHandler(log_path, encoding="utf-8"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


# === Yardımcı Fonksiyonlar ===
def clean_price(raw):
    if not raw:
        return 0.0
    return float(
        raw.replace("TL", "")
           .replace(".", "")
           .replace(",", ".")
           .strip()
    )

def extract_product_id_from_url(url):
    try:
        return url.split("-")[-1]
    except:
        return None

def get_driver():
    options = Options()
    options.add_argument("--headless")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36")
    return webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=options)

def upsert_product(cur, platform, platform_product_id, product_link, title, brand):
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
        logger.warning(f"⚠️ fetchone() boş döndü → {platform_product_id}")
        return None

    # Hem tuple hem dict destekle
    if isinstance(result, dict):
        return result.get("id")
    elif isinstance(result, (tuple, list)):
        return result[0]
    else:
        logger.warning(f"⚠️ fetchone() beklenmeyen formatta: {type(result)} → {result}")
        return None

def insert_price_log(cur, product_id, price, campaign_price, stock_status):
    cur.execute("""
        INSERT INTO product_price_logs (product_id, price, campaign_price, stock_status, created_at)
        VALUES (%s, %s, %s, %s, NOW())
    """, (product_id, price, campaign_price, stock_status))

# === Ana Bot Fonksiyonu ===
def run_hepsiburada_bot():
    print("🟡 Hepsiburada bot başlatıldı...")
    logging.info("🟡 Hepsiburada bot başlatıldı...")

    terms_file = "/app/search_terms/terms.txt"
    if not os.path.exists(terms_file):
        logging.error("❌ terms.txt dosyası bulunamadı.")
        return

    with open(terms_file, "r", encoding="utf-8") as f:
        search_terms = [line.strip() for line in f if line.strip()]

    if not search_terms:
        logging.warning("⚠️ Arama terimi bulunamadı.")
        return

    driver = get_driver()
    conn = get_db_connection()
    logging.info("✅ Veritabanı bağlantısı başarılı.")

    with conn:
        with conn.cursor() as cur:
            for term in search_terms:
                encoded = quote_plus(term)
                print(f"🔍 Arama: {term}")
                logging.info(f"🔍 Arama: {term}")

                for page in range(1, 6):
                    url = f"https://www.hepsiburada.com/ara?q={encoded}&siralama=artanfiyat&sayfa={page}"
                    print(f"🔗 Sayfa {page}: {url}")
                    logging.info(f"🔗 Sayfa {page}")

                    try:
                        driver.get(url)
                        time.sleep(5)
                        soup = BeautifulSoup(driver.page_source, "html.parser")
                        product_cards = soup.find_all("li", class_=re.compile("productListContent-"))

                        if not product_cards:
                            logger.warning(f"⚠️ Sayfa {page} boş geçti.")
                            continue
                        
                        for card in product_cards:
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

                                # Fiyatlar
                                final_price_div = card.find("div", class_=re.compile(r"(^|\s)price-module_finalPrice__"))
                                final_price = clean_price(final_price_div.get_text(strip=True)) if final_price_div else 0.0

                                original_price_div = card.find("div", class_=re.compile(r"(^|\s)price-module_originalPrice__"))
                                original_price = clean_price(original_price_div.get_text(strip=True)) if original_price_div else final_price

                                # Kargo bilgisi
                                kargo_div = card.find("div", class_=re.compile("estimatedArrivalDate"))
                                stock_status = kargo_div.get_text(strip=True).replace("Teslimat bilgisi:", "").strip() if kargo_div else "Belirsiz"

                                if not product_url or not platform_product_id:
                                    logging.warning("⚠️ Geçersiz ürün atlandı.")
                                    continue

                                db_id = upsert_product(cur, "hepsiburada", platform_product_id, product_url, title, brand)
                                if db_id:
                                    insert_price_log(cur, db_id, original_price, final_price, stock_status)
                                    conn.commit()
                                    logging.info(f"✅ {title[:60]}... → {final_price} TL")

                            except Exception as e:
                                logging.error(f"❌ Ürün işleme hatası:\n{traceback.format_exc()}")
                                continue

                    except Exception:
                        logging.error(f"❌ Sayfa yükleme hatası:\n{traceback.format_exc()}")
                        continue

    driver.quit()
    logging.info("✅ Hepsiburada bot tamamlandı.")
    print("✅ Hepsiburada bot tamamlandı.")

if __name__ == "__main__":
    run_hepsiburada_bot()
