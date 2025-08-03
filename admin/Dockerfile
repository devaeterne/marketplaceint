FROM node:18-alpine

WORKDIR /app

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

COPY package*.json ./
RUN npm install

COPY . .

# Inject env into .env file for Vite to access at build
RUN echo "VITE_API_URL=$VITE_API_URL" > .env

EXPOSE 3000
CMD ["npm", "run", "dev"]
