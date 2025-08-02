FROM node:18-alpine

WORKDIR /app

# Package dosyalarını kopyala
COPY package*.json ./

# Bağımlılıkları kur
RUN npm install

# Kaynak kodunu kopyala
COPY . .

# Port
EXPOSE 3000

# Vite dev server
CMD ["npm", "run", "dev"]