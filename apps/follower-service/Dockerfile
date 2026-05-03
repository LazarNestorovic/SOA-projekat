FROM node:18-alpine

WORKDIR /app

COPY follower-service/package.json follower-service/package-lock.json* ./
RUN npm ci --omit=dev

COPY follower-service/src ./src

ENV SERVER_PORT=8084
EXPOSE 8084

CMD ["npm", "start"]
