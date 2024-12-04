@echo off
chcp 65001
FOR /F "tokens=*" %%g IN ('npm root -g --quiet') DO (SET NODE_PATH=%%g)
node build.js