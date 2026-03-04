@echo off
cd /d "%~dp0"
echo Installing dependencies...
call npm install --silent
echo Starting Project Tracker...
start http://localhost:7777
node server.js
