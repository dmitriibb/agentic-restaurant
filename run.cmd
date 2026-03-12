@echo off
setlocal

REM ── run.cmd — build & start every service with one command ──

set COMPOSE_FILE=docker-compose.yml

if "%~1"=="" goto :up
if "%~1"=="up" goto :up
if "%~1"=="build" goto :build
if "%~1"=="down" goto :down
if "%~1"=="restart" goto :restart
if "%~1"=="logs" goto :logs
if "%~1"=="ps" goto :ps
if "%~1"=="clean" goto :clean
goto :usage

:up
echo Building and starting all services ...
docker compose -f %COMPOSE_FILE% up --build -d
echo.
echo All services starting. Access the app at http://localhost
echo   Swagger UIs:
echo     users-service  - http://localhost:8081/swagger-ui.html
echo     menu-service   - http://localhost:8082/swagger-ui.html
echo     orders-service - http://localhost:8083/swagger-ui.html
echo.
echo   Run 'run.cmd logs' to follow logs.
goto :eof

:build
echo Building all images ...
docker compose -f %COMPOSE_FILE% build
goto :eof

:down
echo Stopping all services ...
docker compose -f %COMPOSE_FILE% down
goto :eof

:restart
echo Restarting all services ...
docker compose -f %COMPOSE_FILE% down
docker compose -f %COMPOSE_FILE% up --build -d
goto :eof

:logs
docker compose -f %COMPOSE_FILE% logs -f
goto :eof

:ps
docker compose -f %COMPOSE_FILE% ps
goto :eof

:clean
echo Stopping services and removing volumes (database data will be lost) ...
docker compose -f %COMPOSE_FILE% down -v
goto :eof

:usage
echo Usage: run.cmd [command]
echo.
echo Commands:
echo   up        Build images (if needed) and start all services (default)
echo   build     Build / rebuild all images without starting
echo   down      Stop and remove all containers
echo   restart   down + up
echo   logs      Tail logs from all services
echo   ps        Show running containers
echo   clean     Stop containers, remove volumes (wipes databases!)
goto :eof
