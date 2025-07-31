from dotenv import load_dotenv
load_dotenv()

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from bs4 import BeautifulSoup
import time
from urllib.parse import quote_plus
import os
import psycopg2

# PostgreSQL bağlantı ayarları
PG_HOST = os.getenv("PG_HOST", "localhost")
PG_PORT = int(os.getenv("PG_PORT", 5432))
PG_DB = os.getenv("PG_DB", "marketplace")
PG_USER = os.getenv("PG_USER", "postgres")
PG_PASS = os.getenv("PG_PASS", "postgres")

conn = psycopg2.connect(
    host=PG_HOST,
    port=PG_PORT,
    dbname=PG_DB,
    user=PG_USER,
    password=PG_PASS
)
conn.autocommit = True

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
    return cur.fetchone()[0]

def insert_price_log(cur, product_id, price, campaign_price, stock_status):
    cur.execute("""
        INSERT INTO product_price_logs (product_id, price, campaign_price, stock_status)
        VALUES (%s, %s, %s, %s);
    """, (product_id, price, campaign_price, stock_status))

def run_trendyol_bot():
    print("🟡 Trendyol bot başlatıldı...")

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

    service = Service("/usr/bin/chromedriver")
    driver = webdriver.Chrome(service=service, options=chrome_options)

    with open("./search_terms/terms.txt", "r", encoding="utf-8") as f:
        search_terms = [line.strip() for line in f if line.strip()]

    with conn.cursor() as cur:
        for term in search_terms:
            print(f"🔍 '{term}' için ürünler çekiliyor...")
            encoded_term = quote_plus(term)

            for page in range(1, 6):
                url = f"https://www.trendyol.com/sr?q={encoded_term}&os=1&sst=PRICE_BY_ASC&pi={page}"
                driver.get(url)
                time.sleep(5)

                soup = BeautifulSoup(driver.page_source, "html.parser")
                products = soup.find_all("div", class_="p-card-wrppr")

                if not products:
                    print(f"⚠️ Sayfa {page} için ürün bulunamadı, devam ediliyor...")
                    continue

                for product in products:
                    product_id = product.get("data-id", None)
                    title = product.get("title", None)

                    marka_span = product.find("span", class_="prdct-desc-cntnr-ttl")
                    marka = marka_span.text.strip() if marka_span else None

                    fiyat_div = product.find("div", class_="price-item")
                    raw_price = fiyat_div.text.strip() if fiyat_div else "0"
                    clean_price = raw_price.replace("TL", "").replace(".", "").replace(",", ".").strip()

                    try:
                        fiyat = float(clean_price)
                    except ValueError:
                        fiyat = 0.0

                    kampanya_div = product.find("div", class_="lowest-price-discounted")
                    if kampanya_div:
                        kampanya_raw = kampanya_div.text.strip()
                        kampanya_clean = kampanya_raw.replace("TL", "").replace(".", "").replace(",", ".").strip()
                        try:
                            kampanya_fiyat = float(kampanya_clean)
                        except:
                            kampanya_fiyat = 0
                    else:
                        kampanya_fiyat = 0

                    hizli_teslimat_div = product.find("div", class_="rushDelivery")
                    kargo_durumu = "Yarın kargoda" if hizli_teslimat_div else "2 gün içinde kargoda"

                    urun_linki = None
                    link_tag = product.find("a", href=True)
                    if link_tag:
                        urun_linki = "https://www.trendyol.com" + link_tag["href"]

                    product_db_id = upsert_product(cur, "trendyol", product_id, urun_linki, title, marka)

                    insert_price_log(cur, product_db_id, fiyat, kampanya_fiyat, kargo_durumu)

    driver.quit()
    print("✅ Trendyol bot başarıyla tamamlandı.\n")

if __name__ == "__main__":
    run_trendyol_bot()
