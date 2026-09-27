@echo off
title Open from updates
cd /d "%~dp0"
echo Opening LatinLearn (all languages) again...
node scripts\maintenance.mjs open
pause
