@echo off
rem Builds LatinLearn and uploads it to GitHub. Your phone gets the update in about 2 minutes.
cd /d "%~dp0"
call npm run build || goto fail
git add -A
git commit -m "Update LatinLearn"
git push || goto fail
echo.
echo Uploaded! Your phone will have the new version in about 2 minutes.
pause
exit /b 0
:fail
echo.
echo Something went wrong - see the messages above.
pause
