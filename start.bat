@echo off
title PixelForge - Starting...
echo.
echo  ==============================
echo   PixelForge Image Editor
echo  ==============================
echo.
echo  Starting local server...
echo  Opening http://localhost:8000
echo.
echo  (Keep this window open while using the app)
echo  (Press Ctrl+C to stop the server)
echo.
start "" http://localhost:8000
python -m http.server 8000
