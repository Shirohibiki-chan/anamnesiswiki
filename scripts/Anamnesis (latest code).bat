@echo off
title Anamnesis - keep this window open
cd /d "%~dp0.."

echo.
echo   Starting Anamnesis with the newest code.
echo.
echo   KEEP THIS BLACK WINDOW OPEN. Closing it closes the app.
echo   The app window takes a few seconds to appear the first time.
echo.

rem ---------------------------------------------------------------------
rem This script must not use pnpm, and that is not a style preference.
rem
rem pnpm is installed under %APPDATA%\npm, and %APPDATA% is redirected for
rem processes running inside the Claude desktop app's package container --
rem to AppData\Local\Packages\Claude_.../LocalCache\Roaming. So pnpm exists
rem only in that container. A shortcut you double-click runs outside it and
rem sees the real, empty folder. Anything Claude "verified" using pnpm was
rem verified against a filesystem this machine does not have.
rem
rem Everything below is on the real disk: node in Program Files, cargo in
rem the user profile, and tauri in the repo's own node_modules\.bin. That
rem is also why tauri.conf.json's beforeDevCommand is `npm run dev` rather
rem than `pnpm dev` -- npm ships with node and is not redirected.
rem
rem Syntax is deliberately dull: no for-loops, no delayed expansion, no
rem multi-line blocks, CRLF endings enforced by .gitattributes. cmd parses
rem batch files by byte offset, and a mis-parsed block does not error -- it
rem silently makes conditions false, which looks exactly like missing files.
rem ---------------------------------------------------------------------

set "PATHEXT=.COM;.EXE;.BAT;.CMD;.VBS;.JS;.WSF;.MSC"

if exist "%USERPROFILE%\.cargo\bin" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles%\Git\cmd" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"

if exist "%ProgramFiles%\nodejs\node.exe" goto hasnode
echo   Can't start -- Node isn't at "%ProgramFiles%\nodejs".
echo   Install Node from nodejs.org, then try again.
echo.
pause
exit /b 1

:hasnode
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" goto hascargo
echo   Can't start -- Rust isn't at "%USERPROFILE%\.cargo\bin".
echo   Install it from rustup.rs, then try again.
echo.
pause
exit /b 1

:hascargo
if exist "node_modules\.bin\tauri.cmd" goto hastauri
echo   Can't start -- the project's dependencies aren't installed.
echo   Expected: "%CD%\node_modules\.bin\tauri.cmd"
echo.
echo   Ask Claude to run an install, or run this in a terminal here:
echo     npm install
echo.
pause
exit /b 1

:hastauri

rem Best-effort: silently skipped with no internet, nothing to pull, or local
rem edits a fast-forward would overwrite. None should stop the app opening.
git pull --ff-only >nul 2>&1

call "node_modules\.bin\tauri.cmd" dev

if not errorlevel 1 exit /b 0
echo.
echo   Anamnesis stopped with an error. The message above says why.
echo.
pause
exit /b 1
