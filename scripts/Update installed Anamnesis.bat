@echo off
title Updating Anamnesis - this takes a few minutes
cd /d "%~dp0.."

echo.
echo   Rebuilding Anamnesis from the newest code and installing it.
echo   This takes a few minutes. You can leave it running.
echo.

rem Must not use pnpm -- see the long note in "Anamnesis (latest code).bat".
rem pnpm lives under a redirected %APPDATA% that only exists inside the Claude
rem app's container, so it is not present when you run this yourself.

set "PATHEXT=.COM;.EXE;.BAT;.CMD;.VBS;.JS;.WSF;.MSC"

if exist "%USERPROFILE%\.cargo\bin" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles%\Git\cmd" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"

if exist "%ProgramFiles%\nodejs\node.exe" goto hasnode
echo   Can't build -- Node isn't at "%ProgramFiles%\nodejs". Nothing changed.
echo.
pause
exit /b 1

:hasnode
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" goto hascargo
echo   Can't build -- Rust isn't at "%USERPROFILE%\.cargo\bin". Nothing changed.
echo.
pause
exit /b 1

:hascargo
if exist "node_modules\.bin\tauri.cmd" goto hastauri
echo   Can't build -- the project's dependencies aren't installed.
echo   Expected: "%CD%\node_modules\.bin\tauri.cmd". Nothing changed.
echo.
pause
exit /b 1

:hastauri

rem The build refuses to run when tauri.conf.json declares an updater public
rem key and no matching private key is available, because it would otherwise
rem produce a release no installed copy would accept.
set "KEYFILE=%USERPROFILE%\.tauri\anamnesis-updater.key"
if exist "%KEYFILE%" goto haskey
echo.
echo   Couldn't find the update signing key at:
echo     %KEYFILE%
echo   Restore it from your backup, then run this again. Nothing was changed.
echo.
pause
exit /b 1

:haskey
set /p TAURI_SIGNING_PRIVATE_KEY=<"%KEYFILE%"
set "TAURI_SIGNING_PRIVATE_KEY_PASSWORD="

git pull --ff-only

call "node_modules\.bin\tauri.cmd" build
if not errorlevel 1 goto built
echo.
echo   The build failed. The message above says why. Nothing was installed,
echo   so the copy you already have is untouched.
echo.
pause
exit /b 1

:built

rem Newest installer first, so this picks up whatever was just built rather
rem than needing a version number hardcoded here.
set "SETUP="
for /f "delims=" %%f in ('dir /b /o-d "src-tauri\target\release\bundle\nsis\*-setup.exe" 2^>nul') do if not defined SETUP set "SETUP=%%f"
if defined SETUP goto hassetup
echo   The build finished but produced no installer. Nothing was installed.
echo.
pause
exit /b 1

:hassetup
echo.
echo   Installing %SETUP% ...
start "" /wait "src-tauri\target\release\bundle\nsis\%SETUP%" /S

echo.
echo   Done. Anamnesis in your Start menu is now up to date.
echo.
pause
exit /b 0
