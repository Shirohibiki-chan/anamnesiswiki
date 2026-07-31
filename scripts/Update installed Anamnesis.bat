@echo off
setlocal enabledelayedexpansion
title Updating Anamnesis - this takes a few minutes
cd /d "%~dp0.."

echo.
echo   Rebuilding Anamnesis from the newest code and installing it.
echo   This takes a few minutes. You can leave it running.
echo.

rem See the note in "Anamnesis (latest code).bat" -- a double-clicked shortcut
rem inherits Explorer's cached environment, so PATH here can be missing tools
rem that are installed and registered perfectly well.
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
  echo   Can't build -- these aren't installed where expected:!MISSING!
  echo.
  echo   Signing out and back in often fixes this on its own. Nothing was
  echo   changed, so the copy you already have still works.
  echo.
  pause
  exit /b 1
)

git pull --ff-only
call pnpm install --frozen-lockfile

rem The build refuses to run when tauri.conf.json declares an updater public
rem key and no matching private key is available, because it would otherwise
rem produce a release no installed copy would accept. Read it from the same
rem place `tauri signer generate` put it.
set "KEYFILE=%USERPROFILE%\.tauri\anamnesis-updater.key"
if not exist "%KEYFILE%" (
  echo.
  echo   Couldn't find the update signing key at:
  echo     %KEYFILE%
  echo   Restore it from your backup, then run this again. Nothing was changed.
  echo.
  pause
  exit /b 1
)
set /p TAURI_SIGNING_PRIVATE_KEY=<"%KEYFILE%"
set "TAURI_SIGNING_PRIVATE_KEY_PASSWORD="

call pnpm tauri build
if errorlevel 1 (
  echo.
  echo   The build failed. The message above says why. Nothing was installed,
  echo   so the copy you already have is untouched.
  echo.
  pause
  exit /b 1
)

rem Newest installer first, so this picks up whatever was just built rather
rem than needing a version number hardcoded here.
set "SETUP="
for /f "delims=" %%f in ('dir /b /o-d "src-tauri\target\release\bundle\nsis\*-setup.exe" 2^>nul') do (
  if not defined SETUP set "SETUP=%%f"
)
if not defined SETUP (
  echo   The build finished but produced no installer. Nothing was installed.
  pause
  exit /b 1
)

echo.
echo   Installing %SETUP% ...
start "" /wait "src-tauri\target\release\bundle\nsis\%SETUP%" /S

echo.
echo   Done. Anamnesis in your Start menu is now up to date.
echo.
pause
exit /b 0

:addpath
rem %1 = tool to look for, %2 = folder to add if it isn't already reachable.
where %1 >nul 2>&1
if errorlevel 1 if exist "%~2" set "PATH=%~2;%PATH%"
goto :eof
