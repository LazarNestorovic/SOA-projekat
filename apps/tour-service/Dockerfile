FROM node:18-alpine

WORKDIR /app

COPY tour-service/package*.json ./
RUN npm install

COPY tour-service/ .

EXPOSE 8085

CMD ["node", "src/app.js"]
