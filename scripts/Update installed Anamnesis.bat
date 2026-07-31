@echo off
title Updating Anamnesis - this takes a few minutes
cd /d "%~dp0.."

echo.
echo   Rebuilding Anamnesis from the newest code and installing it.
echo   This takes a few minutes. You can leave it running.
echo.

rem Same deliberately-boring cmd syntax as "Anamnesis (latest code).bat", and
rem for the same reason -- see the note in that file and scripts/README.md.
set "PATHEXT=.COM;.EXE;.BAT;.CMD;.VBS;.JS;.WSF;.MSC"

if exist "%USERPROFILE%\.cargo\bin" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles%\Git\cmd" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
if exist "%APPDATA%\npm" set "PATH=%APPDATA%\npm;%PATH%"

set "PNPM="
if exist "%APPDATA%\npm\pnpm.cmd" set "PNPM=%APPDATA%\npm\pnpm.cmd"
if not defined PNPM if exist "%USERPROFILE%\AppData\Roaming\npm\pnpm.cmd" set "PNPM=%USERPROFILE%\AppData\Roaming\npm\pnpm.cmd"
if not defined PNPM if exist "%LOCALAPPDATA%\pnpm\pnpm.cmd" set "PNPM=%LOCALAPPDATA%\pnpm\pnpm.cmd"
if not defined PNPM if exist "%ProgramFiles%\nodejs\pnpm.cmd" set "PNPM=%ProgramFiles%\nodejs\pnpm.cmd"
if defined PNPM goto haspnpm

echo   Can't build -- pnpm wasn't found. Nothing was changed, so the copy you
echo   already have still works. Looked in:
echo     %APPDATA%\npm\pnpm.cmd
echo     %USERPROFILE%\AppData\Roaming\npm\pnpm.cmd
echo     %LOCALAPPDATA%\pnpm\pnpm.cmd
echo     %ProgramFiles%\nodejs\pnpm.cmd
echo.
echo   What is actually in that first folder:
dir /a /b "%APPDATA%\npm" 2>nul
echo.
pause
exit /b 1

:haspnpm

if exist "%USERPROFILE%\.cargo\bin\cargo.exe" goto hascargo
echo   Can't build -- Rust isn't at %USERPROFILE%\.cargo\bin. Nothing changed.
echo.
pause
exit /b 1

:hascargo

rem The build refuses to run when tauri.conf.json declares an updater public
rem key and no matching private key is available, because it would otherwise
rem produce a release no installed copy would accept. Read it from the same
rem place `tauri signer generate` put it.
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
call "%PNPM%" install --frozen-lockfile

call "%PNPM%" tauri build
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
