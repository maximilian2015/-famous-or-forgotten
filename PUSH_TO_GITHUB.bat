@echo off
title Upload to GitHub
cd /d "C:\Users\maximilian\Desktop\game"
echo.
echo   Uploading Famous or Forgotten to GitHub...
echo   A GitHub login window may open - approve it there.
echo.
"C:\games\Git\cmd\git.exe" push -u origin main
echo.
echo   ============================================
echo   Done. Read the lines above.
echo   If you see "branch 'main' set up to track" - it worked.
echo   ============================================
echo.
pause
