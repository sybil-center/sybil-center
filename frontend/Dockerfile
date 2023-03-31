FROM node:18-alpine AS builder

ARG REACT_APP_VC_PROVIDER_URL_API
ARG REACT_APP_INFURA_API_KEY
ARG REACT_APP_WALLET_CONNECT_PROJECT_ID
ARG REACT_APP_WALLET_APP_NAME=vc-provider

WORKDIR /app

COPY . .

RUN npm ci && npm run build

FROM nginx:alpine-slim

COPY --from=builder /app/build /usr/share/nginx/html
COPY deployment/default.conf.template /etc/nginx/templates/default.conf.template
