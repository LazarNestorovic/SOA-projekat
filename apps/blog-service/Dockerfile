FROM node:lts-alpine

WORKDIR /app

COPY . .

RUN if [ -f package.json ]; then \
			if [ -f package-lock.json ]; then \
				npm ci --omit=dev; \
			else \
				npm install --omit=dev; \
			fi; \
		else \
			echo "package.json not found, skipping npm install"; \
		fi

EXPOSE 3002

CMD ["sh", "-c", "if [ -f package.json ]; then npm run start; else echo 'package.json not found, container is idling'; tail -f /dev/null; fi"]
