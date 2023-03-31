FROM node:18-alpine AS builder

WORKDIR /app

COPY . .

RUN npm install && npm run build

FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./

RUN npm install --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

CMD ["node", "./dist/main.js"]
