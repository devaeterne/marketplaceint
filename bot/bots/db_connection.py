from dotenv import load_dotenv
import os
import psycopg2
from psycopg2.extras import RealDictCursor

# .env dosyasını yükle
load_dotenv()

def get_db_connection():
    """
    .env dosyasından database bilgilerini alarak PostgreSQL bağlantısı oluşturur
    """
    # Environment değişkenlerini kontrol et
    required_vars = ["PG_HOST", "PG_PORT", "PG_DB", "PG_USER", "PG_PASS"]
    missing_vars = [var for var in required_vars if not os.getenv(var)]
    
    if missing_vars:
        raise ValueError(f"❌ Eksik environment değişkenleri: {', '.join(missing_vars)}")
    
    try:
        conn = psycopg2.connect(
            host=os.getenv("PG_HOST"),
            port=int(os.getenv("PG_PORT")),
            database=os.getenv("PG_DB"),
            user=os.getenv("PG_USER"),
            password=os.getenv("PG_PASS"),
            cursor_factory=RealDictCursor  # Dict şeklinde sonuç döndürür
        )
        conn.autocommit = True
        
        print(f"✅ Database bağlantısı başarılı: {os.getenv('PG_HOST')}:{os.getenv('PG_PORT')}/{os.getenv('PG_DB')}")
        return conn
        
    except psycopg2.Error as e:
        print(f"❌ Database bağlantı hatası: {e}")
        raise
    except Exception as e:
        print(f"❌ Beklenmeyen hata: {e}")
        raise

def test_connection():
    """Database bağlantısını test eder"""
    try:
        conn = get_db_connection()
        with conn.cursor() as cur:
            cur.execute("SELECT version();")
            version = cur.fetchone()
            print(f"📊 PostgreSQL Sürümü: {version['version']}")
        conn.close()
        return True
    except Exception as e:
        print(f"❌ Bağlantı testi başarısız: {e}")
        return False

if __name__ == "__main__":
    # Test çalıştır
    test_connection()