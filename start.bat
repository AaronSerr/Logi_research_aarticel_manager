@echo off
title Research Article Manager
color 0A
echo ========================================
echo   Research Article Manager
echo   Demarrage de l'application...
echo ========================================
echo.

REM Se placer dans le repertoire du script
cd /d "%~dp0"
echo Repertoire: %CD%
echo.

REM Verifier si npm est disponible
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: npm n'est pas installe ou n'est pas dans le PATH
    echo.
    echo Veuillez installer Node.js depuis: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Verifier si node_modules existe
if not exist "node_modules\" (
    echo node_modules n'existe pas. Installation des dependances...
    echo.
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo ERREUR lors de l'installation des dependances
        pause
        exit /b 1
    )
)

REM Nettoyer les processus Node.js restants
echo Nettoyage des processus restants...
taskkill //F //IM node.exe //T >nul 2>nul
timeout /t 2 /nobreak >nul
echo.

REM Lancer l'application
echo Lancement de l'application...
echo.
call npm run start

REM Si l'application se ferme avec une erreur
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo L'application s'est fermee avec une erreur
    pause
)
