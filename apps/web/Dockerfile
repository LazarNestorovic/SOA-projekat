FROM node:18-alpine AS build

WORKDIR /app

ENV NODE_OPTIONS=--openssl-legacy-provider
ENV NODE_ENV=production
ENV CI=false

COPY package.json ./
RUN npm install --legacy-peer-deps

COPY public ./public
COPY src ./src

RUN npm run build --verbose


FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
