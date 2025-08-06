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

# PostgreSQL bağlantısı
conn = get_db_connection()
log_dir = "bot_logs"
os.makedirs(log_dir, exist_ok=True)
log_path = os.path.join(log_dir, "avansas-detail_latest.log")  # veya f"{bot_name}_latest.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_path, encoding="utf-8"),
        logging.StreamHandler()  # konsola da yaz
    ]
)
def upsert_product(cur, platform, platform_product_id, product_link, title, brand):
    """Ürünü products tablosuna ekle veya güncelle"""
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

def setup_chrome_driver():
    """Chrome driver'ı ayarla ve döndür"""
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



def insert_price_log(cur, product_id, price, campaign_price, stock_status):
    """Fiyat bilgisini product_price_logs tablosuna ekle"""
    cur.execute("""
        INSERT INTO product_price_logs (product_id, price, campaign_price, stock_status, created_at)
        VALUES (%s, %s, %s, %s, NOW());
    """, (product_id, price, campaign_price, stock_status))

def run_n11_bot():
    print("🟡 N11 bot başlatıldı...")
    
    # Chrome driver'ı ayarla
    driver = setup_chrome_driver()
    if not driver:
        print("❌ Chrome driver başlatılamadı!")
        return
        
    wait = WebDriverWait(driver, 10)

    with open("search_terms/terms.txt", "r", encoding="utf-8") as f:
        search_terms = [line.strip() for line in f if line.strip()]

    with conn.cursor() as cur:
        for term in search_terms:
            print(f"🔍 '{term}' için ürünler çekiliyor...")
            encoded_term = quote_plus(term)
            total_items = None
            processed_products = 0

            previous_product_links = set()

            for page in range(1, 6):
                url = f"https://www.n11.com/arama?q={encoded_term}&srt=PRICE_LOW&pg={page}"
                print(f"🔗 Sayfa URL: {url}")
                driver.get(url)

                try:
                    wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div.productArea")))
                except:
                    print(f"⚠️ Sayfa {page} yüklenemedi veya productArea bulunamadı.")
                    break

                soup = BeautifulSoup(driver.page_source, "html.parser")

                # Pagination kontrolü
                pagination = soup.select_one("div.paginationArea")
                if page > 1 and not pagination:
                    print(f"⚠️ Sayfa {page} için pagination yok, döngü kırılıyor.")
                    break

                # Ürünler
                product_items = soup.select("div.productArea li.column")
                if not product_items:
                    print(f"⚠️ Sayfa {page} içindeki ürün listesi boş.")
                    break

                current_links = set()
                for item in product_items:
                    a_tag = item.select_one("a.plink")
                    if not a_tag:
                        continue
                    link = a_tag["href"]
                    current_links.add(link)

                # Ürün linkleri tekrar mı diye kontrol et
                if current_links.issubset(previous_product_links):
                    print(f"⚠️ Sayfa {page} ürünleri tekrar ediyor, döngü durduruluyor.")
                    break

                previous_product_links.update(current_links)

                # Toplam ürün sayısını ilk sayfadan al
                if total_items is None:
                    product_area = soup.find("div", class_="productArea")
                    if product_area:
                        result_text_div = product_area.select_one(".resultView .resultText strong")
                        if result_text_div:
                            try:
                                total_items = int(result_text_div.get_text(strip=True))
                            except:
                                total_items = None

                for item in product_items:
                    try:
                        # Mevcut scraping mantığını koru
                        a_tag = item.select_one("a.plink")
                        urun_linki = a_tag["href"] if a_tag else "Yok"
                        
                        # Ürün linkini tam URL yap
                        if urun_linki and not urun_linki.startswith("http"):
                            urun_linki = "https://www.n11.com" + urun_linki
                        
                        title = item.select_one("h3.productName").get_text(strip=True) if item.select_one("h3.productName") else "Başlık bulunamadı"
                        product_id = a_tag.get("data-id") if a_tag else "Yok"
                        
                        marka_input = item.find("input", {"class": "sellerNickName"})
                        marka = marka_input["value"] if marka_input else "Bilinmeyen"
                        
                        fiyat_span = item.select_one("span.newPrice ins")
                        fiyat_raw = fiyat_span.get_text(strip=True) if fiyat_span else "0"
                        fiyat_clean = fiyat_raw.replace("TL", "").replace(".", "").replace(",", ".").strip()
                        
                        try:
                            fiyat = float(fiyat_clean)
                        except:
                            fiyat = 0.0

                        # Stok durumu kontrolü
                        item_text = item.get_text().lower()
                        stock_status = "Tükendi" if any(word in item_text for word in ["tükendi", "stokta yok", "mevcut değil"]) else "Mevcut"

                        # ===============================
                        # DATABASE İŞLEMLERİ
                        # ===============================
                        
                        if product_id and product_id != "Yok":
                            # 1. Ürünü products tablosuna ekle/güncelle
                            product_db_id = upsert_product(
                                cur, 
                                "n11",  # platform
                                product_id,  # platform_product_id
                                urun_linki,  # product_link
                                title,  # title
                                marka  # brand
                            )

                            if product_db_id:
                                # 2. Fiyat bilgisini product_price_logs tablosuna ekle
                                insert_price_log(
                                    cur,
                                    product_db_id,  # product_id
                                    fiyat,  # price
                                    None,  # campaign_price (şimdilik None)
                                    stock_status  # stock_status
                                )
                                processed_products += 1
                                print(f"✅ DB'ye kaydedildi: {title[:30]}... - {fiyat} TL")
                            else:
                                print(f"❌ DB'ye kaydedilemedi: {product_id}")

                    except Exception as e:
                        print(f"❌ Ürün ayrıştırma hatası: {e}")
                        continue

                # Her sayfa sonrası commit yap
                conn.commit()
                print(f"📄 Sayfa {page} tamamlandı - İşlenen ürün: {processed_products}")

            print(f"🎯 '{term}' için toplam {processed_products} ürün DB'ye kaydedildi")

        # Final commit
        conn.commit()

    driver.quit()
    print("✅ N11 bot tamamlandı.\n")

if __name__ == "__main__":
    run_n11_bot()