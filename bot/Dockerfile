# M1 Mac için ARM64 uyumlu base image
FROM python:3.11-slim

# Zaman dilimi ayarla
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/Istanbul

# Platform kontrolü yap ve uygun browser yükle
RUN apt-get update && apt-get install -y \
  chromium \
  chromium-driver \
  wget \
  curl \
  unzip \
  fonts-liberation \
  fonts-noto-cjk \
  xvfb \
  ca-certificates \
  --no-install-recommends

# Apt önbelleğini temizle
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Virtual environment oluştur
WORKDIR /app
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Python bağımlılıklarını yükle
COPY bots/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt
RUN pip install fastapi uvicorn

# Uygulama kodunu kopyala
COPY bots /app/bots

# search_terms dizinini oluştur
RUN mkdir -p /app/search_terms

# ARM64 için Chromium environment değişkenleri
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMEDRIVER_PATH=/usr/bin/chromedriver

# M1 Mac için özel Chrome seçenekleri
ENV CHROME_OPTIONS="--no-sandbox --disable-dev-shm-usage --disable-gpu --headless=new --window-size=1920,1080"

# FastAPI'yi başlat
CMD ["uvicorn", "bots.main:app", "--host", "0.0.0.0", "--port", "8000"]