FROM node:lts-alpine AS builder

WORKDIR /app

ARG VITE_AUTH_SERVICE_URL=http://localhost:3001
ARG VITE_BLOG_SERVICE_URL=http://localhost:3002
ARG VITE_STAKEHOLDER_SERVICE_URL=http://localhost:3003

ENV VITE_AUTH_SERVICE_URL=$VITE_AUTH_SERVICE_URL
ENV VITE_BLOG_SERVICE_URL=$VITE_BLOG_SERVICE_URL
ENV VITE_STAKEHOLDER_SERVICE_URL=$VITE_STAKEHOLDER_SERVICE_URL

COPY . .

# Build app when source exists; otherwise create a placeholder page.
RUN if [ -f package.json ]; then \
      if [ -f package-lock.json ]; then \
        npm ci; \
      else \
        npm install; \
      fi; \
      npm run build; \
    else \
      mkdir -p dist; \
      printf '<!doctype html><html><head><meta charset="UTF-8"><title>SOA Web</title></head><body><h1>apps/web is ready</h1><p>Add your React/Vite app files and package.json.</p></body></html>' > dist/index.html; \
    fi

FROM nginx:1.27-alpine

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
