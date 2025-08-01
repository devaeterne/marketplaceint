import os
import time
import re
from urllib.parse import quote_plus
import undetected_chromedriver as uc
from bs4 import BeautifulSoup
from db_connection import get_db_connection

# PostgreSQL bağlantısı
conn = get_db_connection()

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
        print(f"⚠️ WARNING: fetchone() None döndü - {platform_product_id}")
        return None

    if isinstance(result, dict) and 'id' in result:
        return result['id']
    elif isinstance(result, (tuple, list)):
        return result[0]
    else:
        print(f"⚠️ WARNING: fetchone() beklenmeyen formatta - {result}")
        return None
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
    if result:
        return result[0]
    else:
        print(f"⚠️ WARNING: fetchone() boş döndü - {platform_product_id}")
        return None

def insert_price_log(cur, product_id, price, campaign_price, stock_status):
    cur.execute("""
        INSERT INTO product_price_logs (product_id, price, campaign_price, stock_status, created_at)
        VALUES (%s, %s, %s, %s, NOW());
    """, (product_id, price, campaign_price, stock_status))

def setup_chrome_driver():
    options = uc.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--user-agent=Mozilla/5.0")
    return uc.Chrome(
        options=options,
        browser_executable_path="/usr/bin/chromium",
        driver_executable_path="/usr/bin/chromedriver"
    )

def extract_product_info(item):
    try:
        link_tag = item.select_one("a.plink") or item.select_one("a[data-id]")
        if not link_tag:
            return None

        product_id = link_tag.get("data-id")
        if not product_id:
            return None

        product_link = link_tag.get("href", "")
        if product_link and not product_link.startswith("http"):
            product_link = "https://www.n11.com" + product_link

        title_element = (
            item.select_one("h3.productName") or
            item.select_one("a[title]")
        )
        title = title_element.get("title") if title_element else title_element.get_text(strip=True)

        brand_input = item.find("input", class_="sellerNickName")
        brand = brand_input.get("value") if brand_input else "Bilinmeyen"

        # 🔍 Fiyat bilgisi
        price = 0.0
        raw_price = ""
        price_container = item.select_one("div.priceContainer")
        price_elem = None

        if price_container:
            price_elem = price_container.select_one("ins") or price_container.select_one(".newPrice")

        if not price_elem:
            # Fallback: unitPrice
            price_elem = item.select_one("span.unitPrice")

        if price_elem:
            raw_price = price_elem.get_text(strip=True)
            print("🧪 raw_price:", raw_price)

            clean_price = re.sub(r'[^\d,.]', '', raw_price.replace("TL", ""))
            clean_price = clean_price.replace(".", "").replace(",", ".")
            print("🧪 clean_price:", clean_price)

            try:
                price = float(clean_price)
            except ValueError:
                price = 0.0

        print("🧪 float_price:", price)

        stock_status = "Tükendi" if "tükendi" in item.get_text().lower() else "Mevcut"

        return {
            'product_id': product_id,
            'product_link': product_link,
            'title': title,
            'brand': brand,
            'price': price,
            'stock_status': stock_status
        }

    except Exception as e:
        print(f"❌ Ürün bilgisi çıkarma hatası: {e}")
        return None

def run_n11_bot():
    print("🟡 N11 bot başlatıldı...")
    driver = setup_chrome_driver()
    if not driver:
        print("❌ Chrome driver başlatılamadı!")
        return

    terms_file = "/app/search_terms/terms.txt"
    if not os.path.exists(terms_file):
        print("❌ terms.txt dosyası bulunamadı!")
        driver.quit()
        return

    with open(terms_file, "r", encoding="utf-8") as f:
        search_terms = [line.strip() for line in f if line.strip()]

    if not search_terms:
        print("❌ Arama terimi bulunamadı!")
        driver.quit()
        return

    with conn.cursor() as cur:
        for term in search_terms:
            print(f"🔍 '{term}' aranıyor...")
            encoded_term = quote_plus(term)
            seen_product_ids = set()

            driver.get("https://www.n11.com")
            time.sleep(2)

            for page in range(1, 4):
                url = f"https://www.n11.com/arama?q={encoded_term}&srt=PRICE_LOW&pg={page}"
                print(f"🔗 Sayfa {page}: {url}")
                driver.get(url)
                time.sleep(5)

                soup = BeautifulSoup(driver.page_source, "html.parser")
                product_area = soup.select_one("#contentListing > div > div.listingHolder > div.productArea")
                if not product_area:
                    print("⚠️ productArea bulunamadı - Sayfa boş olabilir")
                    continue

                items = product_area.select("li.column")
                if not items:
                    print(f"⚠️ Sayfa {page} içinde ürün bulunamadı.")
                    continue

                for i, item in enumerate(items, 1):
                    product_info = extract_product_info(item)
                    if not product_info:
                        continue

                    product_db_id = upsert_product(
                        cur, "n11",
                        product_info['product_id'],
                        product_info['product_link'],
                        product_info['title'],
                        product_info['brand']
                    )

                    if product_db_id is None:
                        continue

                    print(f"💾 Fiyat loglanıyor: {product_info['price']} TL")
                    insert_price_log(
                        cur, product_db_id,
                        product_info['price'],
                        None,
                        product_info['stock_status']
                    )

        conn.commit()
    driver.quit()
    print("✅ N11 bot tamamlandı.")

if __name__ == "__main__":
    run_n11_bot()
