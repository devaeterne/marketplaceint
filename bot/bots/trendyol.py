from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import time
from urllib.parse import quote_plus
import os
import traceback
import logging
from db_connection import get_db_connection

# Log klasörü oluştur
os.makedirs("/app/logs", exist_ok=True)

# Logging yapılandırması
logging.basicConfig(
    filename="/app/logs/trendyol_log.txt",
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)

def get_driver():
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
    return webdriver.Chrome(service=Service("/usr/bin/chromedriver"), options=chrome_options)

def clean_price(value):
    if not value:
        return 0.0
    try:
        return float(value.replace("TL", "").replace(".", "").replace(",", ".").strip())
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
    if row is None:
        raise Exception("🛑 fetchone() boş döndü – ürün ID alınamadı")

    if isinstance(row, tuple):
        return row[0]
    elif isinstance(row, dict):
        return row.get("id") or row.get(0)
    else:
        raise Exception(f"🛑 fetchone() beklenmedik tip döndürdü: {type(row)}")

def insert_price_log(cur, product_id, price, campaign_price, stock_status):
    cur.execute("""
        INSERT INTO product_price_logs (product_id, price, campaign_price, stock_status)
        VALUES (%s, %s, %s, %s);
    """, (product_id, price, campaign_price, stock_status))

def run_trendyol_bot():
    print("🔹 Trendyol bot başlatıldı...")
    logging.info("🔹 Trendyol bot başlatıldı...")

    terms_file = "/app/search_terms/terms.txt"
    if not os.path.exists(terms_file):
        msg = "❌ terms.txt dosyası bulunamadı!"
        print(msg)
        logging.error(msg)
        return

    with open(terms_file, "r", encoding="utf-8") as f:
        search_terms = [line.strip() for line in f if line.strip()]

    if not search_terms:
        msg = "❌ Arama terimi bulunamadı!"
        print(msg)
        logging.error(msg)
        return

    driver = get_driver()
    conn = get_db_connection()
    logging.info("✅ Database bağlantısı başarılı")

    with conn:
        with conn.cursor() as cur:
            for term in search_terms:
                print(f"🔍 '{term}' için ürünler çekiliyor...")
                logging.info(f"🔍 '{term}' için ürünler çekiliyor...")
                encoded_term = quote_plus(term)

                for page in range(1, 6):
                    url = f"https://www.trendyol.com/sr?q={encoded_term}&os=1&sst=PRICE_BY_ASC&pi={page}"
                    print(f"🔗 Sayfa {page}: {url}")
                    logging.info(f"🔗 Sayfa {page}: {url}")

                    try:
                        driver.get(url)
                        time.sleep(5)
                    except Exception as e:
                        print(f"❌ Sayfa yükleme hatası: {e}")
                        logging.error(f"❌ Sayfa yükleme hatası: {e}")
                        continue

                    soup = BeautifulSoup(driver.page_source, "html.parser")
                    products = soup.find_all("div", class_="p-card-wrppr")

                    if not products:
                        print(f"⚠️ Sayfa {page} için ürün bulunamadı")
                        logging.warning(f"⚠️ Sayfa {page} için ürün bulunamadı")
                        continue

                    print(f"✅ Sayfa {page}'da {len(products)} ürün bulundu")
                    logging.info(f"✅ Sayfa {page}'da {len(products)} ürün bulundu")

                    for product in products:
                        try:
                            product_id = product.get("data-id")
                            if not product_id:
                                continue

                            brand_tag = product.select_one(".prdct-desc-cntnr-ttl")
                            title_tag = product.select_one(".prdct-desc-cntnr-name")

                            brand = brand_tag.get_text(strip=True) if brand_tag else None
                            title = title_tag.get_text(strip=True) if title_tag else None

                            link_tag = product.find("a", href=True)
                            product_link = "https://www.trendyol.com" + link_tag["href"] if link_tag else None

                            # Fiyat bilgisi konteyneri
                            price_info = product.find("div", class_="price-information")
                            if not price_info:
                                logging.warning("⚠️ Fiyat konteyneri bulunamadı.")
                                continue

                            # Kampanya fiyatı (öncelik sırasına göre kontrol)
                            campaign_tag = price_info.select_one(
                                    ".price-item.lowest-price-discounted, .price-item.basket-price-original, .price-item.discounted, .price-item.basket-price-discounted"
                            )

                            # Normal fiyat
                            price_tag = price_info.select_one(".price-item:not(.lowest-price-discounted):not(.basket-price-original):not(.discounted):not(.basket-price-discounted)")

                            # Fiyatları temizle
                            campaign_price = clean_price(campaign_tag.get_text(strip=True)) if campaign_tag else 0.0
                            price = clean_price(price_tag.get_text(strip=True)) if price_tag else campaign_price

                            # Kargo bilgisi
                            delivery_div = product.find("div", class_="rushDelivery")
                            stock_status = "Yarın kargoda" if delivery_div else "2 gün içinde kargoda"

                            product_db_id = upsert_product(cur, "trendyol", product_id, product_link, title, brand)
                            insert_price_log(cur, product_db_id, price, campaign_price, stock_status)
                            conn.commit()

                            msg = f"✅ Kaydedildi: {title[:50] if title else 'İsimsiz'}... - {price} TL"
                            print(msg)
                            logging.info(msg)

                        except Exception as e:
                            error_msg = f"❌ Ürün işleme hatası:\n{traceback.format_exc()}"
                            print(error_msg)
                            logging.error(error_msg)

    driver.quit()
    print("✅ Trendyol bot başarıyla tamamlandı.")
    logging.info("✅ Trendyol bot başarıyla tamamlandı.")

if __name__ == "__main__":
    run_trendyol_bot()
