# ── Build stage ──────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/orders-client/package.json apps/orders-client/package.json
COPY apps/staff-client/package.json apps/staff-client/package.json
COPY apps/ui-common-libs ./apps/ui-common-libs
RUN npm ci --ignore-scripts

COPY apps/staff-client ./apps/staff-client

# Build with empty base URLs so all API calls become relative paths
# (e.g. "/api/v1/auth/login") and nginx can proxy them.
ENV VITE_USERS_SERVICE_BASE_URL=""
ENV VITE_PRODUCTION_SERVICE_BASE_URL=""
ARG VITE_LOCAL_IP
ENV VITE_LOCAL_IP=$VITE_LOCAL_IP
RUN npm run build --workspace @agentic-restaurant/ui-common-libs && npm run build --workspace staff-client

# ── Runtime stage ────────────────────────────────────────────
FROM nginx:1.27-alpine

COPY --from=build /workspace/apps/staff-client/dist /usr/share/nginx/html
COPY apps/staff-client/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
