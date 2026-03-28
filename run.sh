#!/usr/bin/env bash
set -euo pipefail

# ── run.sh — build & start every service with one command ──
LOCAL_IP=""
if command -v ip >/dev/null 2>&1; then
  LOCAL_IP=$(ip -4 -o addr show scope global up | awk '{split($4, parts, "/"); print parts[1]; exit}')
fi

if [[ -z "$LOCAL_IP" ]] && command -v hostname >/dev/null 2>&1; then
  LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi

export LOCAL_IP="${LOCAL_IP:-localhost}"
COMPOSE_FILE="docker-compose.yml"

if docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "Docker Compose is not installed. Install Docker Compose v2 or the docker-compose CLI." >&2
  exit 1
fi

compose() {
  "${COMPOSE_CMD[@]}" -f "$COMPOSE_FILE" "$@"
}

usage() {
  echo "Usage: ./run.sh [command]"
  echo ""
  echo "Commands:"
  echo "  up        Build images (if needed) and start all services (default)"
  echo "  build     Build / rebuild all images without starting"
  echo "  down      Stop and remove all containers"
  echo "  restart   down + up"
  echo "  logs      Tail logs from all services"
  echo "  ps        Show running containers"
  echo "  clean     Stop containers, remove volumes (wipes databases!)"
}

case "${1:-up}" in
  up)
    echo "▸ Building and starting all services …"
    compose up --build -d
    echo ""
    echo "✔ All services starting. Access the app at http://localhost"
    echo "  Swagger UIs:"
    echo "    users-service  → http://localhost:8081/swagger-ui.html"
    echo "    menu-service   → http://localhost:8082/swagger-ui.html"
    echo "    orders-service → http://localhost:8083/swagger-ui.html"
    echo ""
    echo "  Run './run.sh logs' to follow logs."
    ;;
  build)
    echo "▸ Building all images …"
    compose build
    ;;
  down)
    echo "▸ Stopping all services …"
    compose down
    ;;
  restart)
    echo "▸ Restarting all services …"
    compose down
    compose up --build -d
    ;;
  logs)
    compose logs -f
    ;;
  ps)
    compose ps
    ;;
  clean)
    echo "▸ Stopping services and removing volumes (database data will be lost) …"
    compose down -v
    ;;
  *)
    usage
    ;;
esac
