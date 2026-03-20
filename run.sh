#!/usr/bin/env bash
set -euo pipefail

# ── run.sh — build & start every service with one command ──
if command -v ip >/dev/null 2>&1; then
  export LOCAL_IP=$(ip -4 addr show scope global | grep inet | head -n1 | awk '{print $2}' | cut -d/ -f1)
elif command -v hostname >/dev/null 2>&1; then
  export LOCAL_IP=$(hostname -I | awk '{print $1}')
else
  export LOCAL_IP="localhost"
fi
COMPOSE_FILE="docker-compose.yml"

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
    docker compose -f "$COMPOSE_FILE" up --build -d
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
    docker compose -f "$COMPOSE_FILE" build
    ;;
  down)
    echo "▸ Stopping all services …"
    docker compose -f "$COMPOSE_FILE" down
    ;;
  restart)
    echo "▸ Restarting all services …"
    docker compose -f "$COMPOSE_FILE" down
    docker compose -f "$COMPOSE_FILE" up --build -d
    ;;
  logs)
    docker compose -f "$COMPOSE_FILE" logs -f
    ;;
  ps)
    docker compose -f "$COMPOSE_FILE" ps
    ;;
  clean)
    echo "▸ Stopping services and removing volumes (database data will be lost) …"
    docker compose -f "$COMPOSE_FILE" down -v
    ;;
  *)
    usage
    ;;
esac
