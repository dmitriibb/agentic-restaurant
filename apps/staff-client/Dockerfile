# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Build with empty base URLs so all API calls become relative paths
# (e.g. "/api/v1/auth/login") and nginx can proxy them.
ENV VITE_USERS_SERVICE_BASE_URL=""
ENV VITE_PRODUCTION_SERVICE_BASE_URL=""
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
