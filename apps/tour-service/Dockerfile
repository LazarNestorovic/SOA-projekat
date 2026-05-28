FROM node:18-alpine

WORKDIR /app

COPY tour-service/package*.json ./
RUN npm install

COPY tour-service/ .

# Kopiraj proto fajlove koje gRPC klijent dinamički učitava
COPY proto/ ./proto/

EXPOSE 8085 9095

CMD ["node", "src/app.js"]
