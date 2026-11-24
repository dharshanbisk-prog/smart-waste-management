@echo off
title Deploy to GitHub Pages
cd /d "%~dp0"

echo ===================================================================
echo   Deploy IoT Smart Waste System to GitHub Pages
echo ===================================================================
echo.
echo Step 1: Create a new repository on GitHub:
echo         - Open https://github.com/new
echo         - Name it (e.g. smart-waste-system)
echo         - Set it to "Public"
echo         - Do NOT check "Add a README file"
echo         - Click "Create repository"
echo.
echo Step 2: Copy the repository URL and paste it below:
echo         (Example: https://github.com/YOUR_USERNAME/smart-waste-system.git)
echo.
set /p REPO_URL="Paste GitHub Repository URL: "

if "%REPO_URL%"=="" (
    echo.
    echo Error: No URL entered. Aborted.
    pause
    exit /b
)

echo.
echo [1/3] Configuring Git remote...
git remote remove origin 2>nul
git remote add origin %REPO_URL%
git branch -M main
git add .
git commit -m "Deploy to GitHub Pages" 2>nul

echo.
echo [2/3] Uploading project to GitHub...
git push -u origin main

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ===================================================================
    echo   Upload failed.
    echo   Make sure your GitHub URL is correct and you are signed in.
    echo ===================================================================
    pause
    exit /b
)

echo.
echo ===================================================================
echo   SUCCESSFULLY UPLOADED TO GITHUB!
echo ===================================================================
echo.
echo Final Step to Activate Your Live Link:
echo 1. Go to your repository on GitHub.
echo 2. Click "Settings" (at the top right of your repo).
echo 3. Click "Pages" on the left menu.
echo 4. Under "Build and deployment":
echo      - Source: "Deploy from a branch"
echo      - Branch: select "main"
echo      - Folder: select "/ (root)"
echo 5. Click "Save".
echo.
echo Your teacher can now visit your live website at:
echo https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/
echo ===================================================================
echo.
pause
