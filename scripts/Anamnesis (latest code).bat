@echo off
setlocal enabledelayedexpansion
title Anamnesis - keep this window open
cd /d "%~dp0.."

echo.
echo   Starting Anamnesis with the newest code.
echo.
echo   KEEP THIS BLACK WINDOW OPEN. Closing it closes the app.
echo   The app window takes a few seconds to appear the first time.
echo.

rem Explorer hands a double-clicked shortcut the environment it captured when
rem it started, which can predate anything installed since the last sign-in.
rem So PATH here is not the PATH the registry says -- a tool can be correctly
rem installed and correctly registered and still be invisible. Every tool is
rem therefore located explicitly, and PATH is treated as a hint rather than
rem the truth. Tauri's symptom for any of these missing is a low-level
rem "program not found" that reads like a broken install.
call :addpath cargo "%USERPROFILE%\.cargo\bin"
call :addpath node  "%ProgramFiles%\nodejs"
call :addpath pnpm  "%APPDATA%\npm"
call :addpath git   "%ProgramFiles%\Git\cmd"

set "MISSING="
for %%T in (cargo node pnpm) do (
  where %%T >nul 2>&1
  if errorlevel 1 set "MISSING=!MISSING! %%T"
)
if defined MISSING (
  echo   Can't start -- these aren't installed where expected:!MISSING!
  echo.
  echo   Signing out and back in often fixes this on its own, because it
  echo   refreshes what Windows hands to programs you launch.
  echo.
  pause
  exit /b 1
)

rem Best-effort: skipped silently with no internet, nothing to pull, or local
rem edits that a fast-forward would overwrite. None should block the app.
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
exit /b 0

:addpath
rem %1 = tool to look for, %2 = folder to add if it isn't already reachable.
where %1 >nul 2>&1
if errorlevel 1 if exist "%~2" set "PATH=%~2;%PATH%"
goto :eof
