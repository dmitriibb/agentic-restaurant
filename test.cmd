@echo off
setlocal
FOR /F "tokens=2 delims=:" %%A IN ('ipconfig ^| findstr /C:"IPv4 Address"') DO (
    IF NOT DEFINED LOCAL_IP SET "LOCAL_IP=%%A"
)
IF DEFINED LOCAL_IP (
    SET "LOCAL_IP=%LOCAL_IP: =%"
) ELSE (
    SET "LOCAL_IP=localhost"
)
echo IP is %LOCAL_IP%
