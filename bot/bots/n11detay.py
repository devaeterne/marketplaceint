import undetected_chromedriver as uc
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time
import re
from db_connection import get_db_connection

# PostgreSQL bağlantısı
conn = get_db_connection()

def setup_chrome_driver():
    options = uc.ChromeOptions()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    return uc.Chrome(
        options=options,
        browser_executable_path="/usr/bin/chromium",
        driver_executable_path="/usr/bin/chromedriver"
    )

def extract_product_details(driver, url):
    driver.get(url)
    WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
    time.sleep(2)
    soup = BeautifulSoup(driver.page_source, "html.parser")

    desc_elem = soup.select_one(".unf-info-context .unf-info-desc")
    description = desc_elem.get_text(strip=True) if desc_elem else ""

    store_elem = soup.select_one(".unf-p-seller-name")
    store_name = store_elem.get_text(strip=True) if store_elem else ""

    store_rating = 0.0
    rating_span = soup.select_one(".point")
    if rating_span:
        try:
            rating_text = rating_span.get_text(strip=True).replace(",", ".")
            store_rating = float(re.findall(r"\d+\.?\d*", rating_text)[0])
        except:
            store_rating = 0.0

    shipping_info = ""
    kargo_elem = soup.select_one(".cargo") or soup.select_one(".cargo-new")
    if kargo_elem:
        shipping_info = kargo_elem.get_text(strip=True)

    free_shipping = "ücretsiz" in shipping_info.lower()

    rating = None
    rating_elem = soup.select_one(".ratingScore")
    if rating_elem:
        try:
            rating = float(rating_elem.get_text(strip=True).replace(",", "."))
        except:
            rating = None

    category = ""
    breadcrumb = soup.select("#breadCrumb ul li a")
    if len(breadcrumb) >= 2:
        category = breadcrumb[-2].get_text(strip=True)

    image_url = ""
    image_container = soup.select_one(".unf-p-img-box-big img")
    if image_container:
        image_url = image_container.get("src") or image_container.get("data-src") or image_container.get("data-original")

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

    attributes = {}
    rows = soup.select(".unf-prop-list .unf-prop-list-item")
    for row in rows:
        name = row.select_one(".unf-prop-list-title")
        value = row.select_one(".unf-prop-list-prop")
        if name and value:
            attributes[name.get_text(strip=True)] = value.get_text(strip=True)

    tables = soup.select(".productFeatures table tr, .specifications table tr")
    for row in tables:
        cells = row.select("td")
        if len(cells) >= 2:
            key = cells[0].get_text(strip=True)
            val = cells[1].get_text(strip=True)
            if key and val:
                attributes[key] = val

    return details, attributes

def insert_product_detail(cur, product_id, details):
    cur.execute("""
        INSERT INTO product_details (product_id, description, store_name, shipping_info, free_shipping, rating, product_type, image_url, store_rating, created_at)
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

def insert_product_attributes(cur, product_id, attributes):
    cur.execute("DELETE FROM product_attributes WHERE product_id = %s", (product_id,))
    for key, value in attributes.items():
        cur.execute("""
            INSERT INTO product_attributes (product_id, attribute_name, attribute_value, created_at)
            VALUES (%s, %s, %s, NOW());
        """, (product_id, key, value))

def run_n11_detay_bot():
    driver = setup_chrome_driver()
    if not driver:
        print("❌ Chrome başlatılamadı")
        return

    with conn.cursor() as cur:
        cur.execute("""
            SELECT id, product_link FROM products
            WHERE platform = 'n11'
              AND product_link IS NOT NULL
              AND TRIM(product_link) != ''
              AND LOWER(product_link) NOT IN ('none', 'product_link')
              AND NOT EXISTS (
                  SELECT 1 FROM product_details WHERE product_details.product_id = products.id
              )
            ORDER BY created_at DESC;
        """)
        products = cur.fetchall()
        print(f"🔍 {len(products)} ürün bulundu")

        for row in products:
            pid = row['id']
            url = row['product_link']

            try:
                if not url or not url.startswith("http"):
                    print(f"⚠️ Geçersiz URL atlandı: {url}")
                    continue

                print(f"🔗 Ürün: {url}")
                details, attributes = extract_product_details(driver, url)
                insert_product_detail(cur, pid, details)
                insert_product_attributes(cur, pid, attributes)
                conn.commit()
                print(f"✅ Kaydedildi: {pid} → {len(attributes)} özellik")
                time.sleep(2)
            except Exception as e:
                print(f"❌ Hata: {e}")


    driver.quit()
    print("✅ Bot tamamlandı.")

if __name__ == "__main__":
    run_n11_detay_bot()
