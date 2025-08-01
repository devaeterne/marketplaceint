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
os.makedirs("/app/logs", exist_ok=True)
logging.basicConfig(
    filename="/app/logs/hepsiburada_log.txt",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

# === Selenium ayarları ===
def get_driver():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument(
        "user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/115.0.0.0 Safari/537.36"
    )
    return webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=chrome_options)

# === Yardımcı fonksiyonlar ===
def clean_price(raw):
    if not raw:
        return 0.0
    try:
        return float(raw.replace("TL", "").replace(".", "").replace(",", ".").strip())
    except:
        return 0.0

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

    row = cur.fetchone()
    if not row:
        raise Exception("🛑 Ürün eklenemedi")
    return row[0]

def insert_price_log(cur, product_id, price, campaign_price, stock_status):
    cur.execute("""
        INSERT INTO product_price_logs (product_id, price, campaign_price, stock_status)
        VALUES (%s, %s, %s, %s);
    """, (product_id, price, campaign_price, stock_status))

# === Bot ana fonksiyonu ===
def run_hepsiburada_bot():
    print("🟡 Hepsiburada bot başlatıldı...")
    logging.info("🟡 Hepsiburada bot başlatıldı...")

    # Arama terimleri
    terms_file = "/app/search_terms/terms.txt"
    if not os.path.exists(terms_file):
        logging.error("❌ terms.txt dosyası yok!")
        return

    with open(terms_file, "r", encoding="utf-8") as f:
        search_terms = [line.strip() for line in f if line.strip()]

    if not search_terms:
        logging.warning("⚠️ Arama terimi bulunamadı.")
        return

    driver = get_driver()
    conn = get_db_connection()
    logging.info("✅ Database bağlantısı başarılı")

    with conn:
        with conn.cursor() as cur:
            for term in search_terms:
                encoded = quote_plus(term)
                print(f"🔍 '{term}' için ürünler çekiliyor...")
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
                            logging.warning(f"⚠️ Sayfa {page} boş")
                            continue

                        for card in product_cards:
                            try:
                                title_tag = card.find("h2", class_=re.compile("title-module_titleRoot"))
                                title = title_tag.get_text(strip=True) if title_tag else "Yok"

                                brand_span = title_tag.find("span", class_=re.compile("title-module_brandText")) if title_tag else None
                                brand = brand_span.get_text(strip=True) if brand_span else "Yok"

                                price_div = card.find("div", class_=re.compile("price-module_finalPrice"))
                                price = clean_price(price_div.get_text(strip=True)) if price_div else 0.0
                                campaign_price = 0.0  # Hepsiburada sayfasında sepette kampanya bilgisi yoksa sıfır

                                a_tag = card.find("a", href=True)
                                product_link = "https://www.hepsiburada.com" + a_tag["href"] if a_tag else None
                                product_id = a_tag["href"].split("-")[-1] if a_tag else "0"

                                img_tag = card.find("img")
                                image_url = img_tag.get("data-src") or img_tag.get("src") if img_tag else None

                                kargo_div = card.find("div", class_=re.compile("estimatedArrivalDate"))
                                stock_status = kargo_div.get_text(strip=True) if kargo_div else "Bilinmiyor"

                                if not product_link or not product_id:
                                    logging.warning("⚠️ Geçersiz ürün atlandı.")
                                    continue

                                db_id = upsert_product(cur, "hepsiburada", product_id, product_link, title, brand)
                                insert_price_log(cur, db_id, price, campaign_price, stock_status)
                                conn.commit()

                                logging.info(f"✅ Kaydedildi: {title[:40]}... - {price} TL")

                            except Exception:
                                logging.error(f"❌ Ürün işleme hatası:\n{traceback.format_exc()}")
                                continue

                    except Exception:
                        logging.error(f"❌ Sayfa yükleme hatası:\n{traceback.format_exc()}")
                        continue

    driver.quit()
    print("✅ Hepsiburada bot tamamlandı.")
    logging.info("✅ Hepsiburada bot tamamlandı.")

if __name__ == "__main__":
    run_hepsiburada_bot()
