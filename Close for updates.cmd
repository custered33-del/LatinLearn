@echo off
title Close for updates
cd /d "%~dp0"
echo Closing LatinLearn (all languages) for updates...
node scripts\maintenance.mjs close
echo When the update is finished, double-click "Open from updates".
pause
