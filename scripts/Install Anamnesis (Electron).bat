@echo off
title Installing the Electron Anamnesis - this takes a few minutes
cd /d "%~dp0.."

echo.
echo   Building the Electron Anamnesis from the newest code and installing it.
echo   This takes a few minutes. You can leave it running.
echo.
echo   IT INSTALLS ALONGSIDE THE ONE YOU ALREADY HAVE. You will end up with
echo   two Start menu entries both called Anamnesis until you uninstall the
echo   old one -- they read the same worlds, so nothing is duplicated except
echo   the entry itself.
echo.

rem Must not use pnpm -- see the long note in "Anamnesis (latest code).bat".
rem No Rust needed here: the Electron build has none.

set "PATHEXT=.COM;.EXE;.BAT;.CMD;.VBS;.JS;.WSF;.MSC"

if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles%\Git\cmd" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"

if exist "%ProgramFiles%\nodejs\node.exe" goto hasnode
echo   Can't build -- Node isn't at "%ProgramFiles%\nodejs". Nothing changed.
echo.
pause
exit /b 1

:hasnode
if exist "node_modules\electron-builder\cli.js" goto hasbuilder
echo   Can't build -- the project's dependencies aren't installed.
echo   Expected: "%CD%\node_modules\electron-builder". Nothing changed.
echo.
pause
exit /b 1

:hasbuilder

rem ---------------------------------------------------------------------
rem Built outside the repo on purpose.
rem
rem electron-builder unpacks ~370MB of Electron into a temporary folder and
rem then renames it into place. A file watcher holding a handle anywhere
rem inside that folder makes the rename fail with EPERM, every time -- and a
rem dev server watching this repo is exactly such a watcher. Building into
rem %TEMP% sidesteps it whether or not anything else is running, and leaves
rem nothing behind in the project folder.
rem ---------------------------------------------------------------------
set "BUILDDIR=%TEMP%\anamnesis-electron-build"

git pull --ff-only

node "scripts\electron-package.mjs" -c.directories.output="%BUILDDIR%"
if not errorlevel 1 goto built
echo.
echo   The build failed. The message above says why. Nothing was installed,
echo   so the copy you already have is untouched.
echo.
pause
exit /b 1

:built

rem Newest installer first, so this picks up whatever was just built rather
rem than needing a version number written in here.
set "SETUP="
for /f "delims=" %%f in ('dir /b /o-d "%BUILDDIR%\*Setup*.exe" 2^>nul') do if not defined SETUP set "SETUP=%%f"
if defined SETUP goto hassetup
echo   The build finished but produced no installer. Nothing was installed.
echo.
pause
exit /b 1

:hassetup
echo.
echo   Installing %SETUP% ...
echo.
echo   Windows will warn that the publisher is unknown. That is expected --
echo   nothing here is code signed, by choice. Click More info, then Run
echo   anyway.
echo.
start "" /wait "%BUILDDIR%\%SETUP%"

echo.
echo   Done. Look for Anamnesis in your Start menu.
echo.
pause
exit /b 0
