@echo off
title Updating Anamnesis - this takes a few minutes
cd /d "%~dp0.."

echo.
echo   Rebuilding Anamnesis from the newest code and installing it.
echo   This takes a few minutes. You can leave it running.
echo.

rem See the note in "Anamnesis (latest code).bat" -- same PATH hazard.
where cargo >nul 2>&1
if errorlevel 1 set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

git pull --ff-only
call pnpm install --frozen-lockfile

rem The build refuses to run if tauri.conf.json declares an updater public key
rem and no matching private key is available, because it would otherwise
rem produce a release nothing can install. Read from the same place
rem `tauri signer generate` put it.
set "KEYFILE=%USERPROFILE%\.tauri\anamnesis-updater.key"
if not exist "%KEYFILE%" (
  echo.
  echo   Couldn't find the update signing key at:
  echo     %KEYFILE%
  echo   Restore it from your backup, then run this again.
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

rem Newest installer first, so this picks up whatever version was just built
rem rather than needing the number hardcoded here.
set "SETUP="
for /f "delims=" %%f in ('dir /b /o-d "src-tauri\target\release\bundle\nsis\*-setup.exe" 2^>nul') do (
  if not defined SETUP set "SETUP=%%f"
)
if not defined SETUP (
  echo   The build finished but no installer was produced. Nothing installed.
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
