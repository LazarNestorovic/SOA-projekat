FROM node:20-alpine

WORKDIR /app

COPY blog-service/package.json ./
RUN npm install --omit=dev

COPY blog-service/src ./src

# Kopiraj proto fajlove koje gRPC klijent dinamički učitava
COPY proto/ ./proto/

EXPOSE 8083

CMD ["node", "src/app.js"]
