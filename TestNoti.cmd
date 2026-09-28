@echo off
title TestNoti
cd /d "%~dp0"
if not exist notify\node_modules\web-push call npm ci --prefix notify --no-fund --no-audit
echo Sending a test notification to every device with LatinLearn notifications on...
node notify\send.mjs --test
pause
