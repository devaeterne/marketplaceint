# api/Dockerfile
FROM node:20-slim

# Chromium bağımlılıkları
RUN apt-get update && apt-get install -y \
  python3 python3-pip \
  chromium chromium-driver \
  libnss3 libatk-bridge2.0-0 libatk1.0-0 libdrm2 \
  libxcomposite1 libxdamage1 libxrandr2 libgbm-dev \
  libasound2 wget xdg-utils \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

RUN mkdir -p /app/logs && chmod 777 /app/logs
COPY package*.json ./
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
