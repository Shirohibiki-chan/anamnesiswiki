@echo off
setlocal enabledelayedexpansion
title Updating Anamnesis - this takes a few minutes
cd /d "%~dp0.."

echo.
echo   Rebuilding Anamnesis from the newest code and installing it.
echo   This takes a few minutes. You can leave it running.
echo.

rem See the long note in "Anamnesis (latest code).bat": nothing is searched
rem for by name, because a double-clicked shortcut's PATH can't be trusted.
rem See the note in "Anamnesis (latest code).bat" -- npm tools are .cmd files,
rem and a PATHEXT missing .CMD hides all of them.
set "PATHEXT=.COM;.EXE;.BAT;.CMD;.VBS;.JS;.WSF;.MSC"

if exist "%USERPROFILE%\.cargo\bin"  set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
if exist "%ProgramFiles%\nodejs"     set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles%\Git\cmd"    set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
if exist "%APPDATA%\npm"             set "PATH=%APPDATA%\npm;%PATH%"

set "PNPM="
for %%P in (
  "%APPDATA%\npm\pnpm.cmd"
  "%USERPROFILE%\AppData\Roaming\npm\pnpm.cmd"
  "%LOCALAPPDATA%\pnpm\pnpm.exe"
  "%ProgramFiles%\nodejs\pnpm.cmd"
) do if not defined PNPM if exist "%%~P" set "PNPM=%%~P"

if not defined PNPM (
  echo   Can't build -- pnpm wasn't found. Looked in:
  echo     %APPDATA%\npm\pnpm.cmd
  echo     %USERPROFILE%\AppData\Roaming\npm\pnpm.cmd
  echo     %LOCALAPPDATA%\pnpm\pnpm.exe
  echo     %ProgramFiles%\nodejs\pnpm.cmd
  echo.
  echo   Nothing was changed, so the copy you already have still works.
  echo   Send this list to Claude -- one of those paths is wrong for this PC.
  echo.
  pause
  exit /b 1
)

if not exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
  echo   Can't build -- Rust isn't at %USERPROFILE%\.cargo\bin. Nothing changed.
  echo.
  pause
  exit /b 1
)

git pull --ff-only
call "%PNPM%" install --frozen-lockfile

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

call "%PNPM%" tauri build
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
