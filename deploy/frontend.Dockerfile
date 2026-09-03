FROM node:22-alpine AS build

ARG NPM_REGISTRY=https://registry.npmmirror.com

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm config set registry "$NPM_REGISTRY" \
    && npm config set fetch-retries 5 \
    && npm config set fetch-retry-mintimeout 10000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm config set fetch-timeout 300000 \
    && npm ci --no-audit --no-fund

COPY frontend ./
ARG VITE_API_URL=
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine

COPY deploy/frontend.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html

EXPOSE 80
