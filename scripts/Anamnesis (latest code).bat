@echo off
title Anamnesis - keep this window open
cd /d "%~dp0.."

echo.
echo   Starting Anamnesis with the newest code.
echo.
echo   KEEP THIS BLACK WINDOW OPEN. Closing it closes the app.
echo   The app window takes a few seconds to appear the first time.
echo.

rem Rust installs to %USERPROFILE%\.cargo\bin and puts itself on PATH, but a
rem shell started before that happened -- or by another program that passed
rem down an older environment -- won't have it, and Tauri's only symptom is
rem "program not found" for cargo metadata. Cheaper to add it than to explain.
where cargo >nul 2>&1
if errorlevel 1 set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

rem Pull the latest committed code. Skipped silently if there's nothing to
rem pull, if there's no internet, or if local edits would be overwritten --
rem none of which should stop the app from opening.
git pull --ff-only >nul 2>&1

rem Keeps node_modules in step when dependencies changed since last launch.
call pnpm install --frozen-lockfile --prefer-offline >nul 2>&1

call pnpm tauri dev

if errorlevel 1 (
  echo.
  echo   Anamnesis stopped with an error. The message above says why.
  echo.
  pause
)
