@echo off
rem Lets the online LatinLearn talk to Ollama (the free local AI) on this PC.
rem Only this one website is allowed, and only from this computer.
setx OLLAMA_ORIGINS "https://custered33-del.github.io"
echo Restarting Ollama...
taskkill /IM "ollama app.exe" /F >nul 2>&1
taskkill /IM ollama.exe /F >nul 2>&1
start "" "%LOCALAPPDATA%\Programs\Ollama\ollama app.exe"
echo Done. Auxilium can now use your local AI.
pause
