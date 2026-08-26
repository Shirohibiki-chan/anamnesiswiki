@echo off
title Anamnesis (Electron) - keep this window open
cd /d "%~dp0.."

echo.
echo   Starting the Electron Anamnesis with the newest code.
echo.
echo   KEEP THIS BLACK WINDOW OPEN. Closing it closes the app.
echo   The app window takes a few seconds to appear.
echo.
echo   This is the Phase 29 shell. It runs on its own port, so the old
echo   "Anamnesis (latest code)" launcher can be open at the same time.
echo.

rem ---------------------------------------------------------------------
rem Same rule as the Tauri launcher beside this one: no pnpm. pnpm lives
rem under a redirected %APPDATA% that only exists inside the Claude desktop
rem app's container, so a shortcut you double-click cannot see it. Node is
rem in Program Files and everything else is in this repo's node_modules.
rem
rem Unlike that one, this needs no Rust and no cargo -- there is no Rust in
rem the Electron build. One less thing that can be missing.
rem
rem Syntax stays deliberately dull: no for-loops, no delayed expansion, no
rem multi-line blocks. cmd parses batch files by byte offset and a
rem mis-parsed block does not error, it silently makes conditions false.
rem ---------------------------------------------------------------------

set "PATHEXT=.COM;.EXE;.BAT;.CMD;.VBS;.JS;.WSF;.MSC"

if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%ProgramFiles%\Git\cmd" set "PATH=%ProgramFiles%\Git\cmd;%PATH%"

if exist "%ProgramFiles%\nodejs\node.exe" goto hasnode
echo   Can't start -- Node isn't at "%ProgramFiles%\nodejs".
echo   Install Node from nodejs.org, then try again.
echo.
pause
exit /b 1

:hasnode
if exist "node_modules\electron\index.js" goto haselectron
echo   Can't start -- the project's dependencies aren't installed.
echo   Expected: "%CD%\node_modules\electron".
echo.
echo   Ask Claude to run an install, or run this in a terminal here:
echo     npm install
echo.
pause
exit /b 1

:haselectron

rem Best-effort: silently skipped with no internet, nothing to pull, or local
rem edits a fast-forward would overwrite. None should stop the app opening.
git pull --ff-only >nul 2>&1

node "scripts\electron-dev.mjs"

if not errorlevel 1 exit /b 0
echo.
echo   Anamnesis stopped with an error. The message above says why.
echo.
pause
exit /b 1
