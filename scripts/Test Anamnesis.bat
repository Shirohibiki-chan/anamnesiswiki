@echo off
title Anamnesis tests - keep this window open
cd /d "%~dp0.."

echo.
echo   Running the app tests.
echo.
echo   This builds Anamnesis, then opens and drives it several times over
echo   on a made-up world. Windows will flash open and shut. That is the
echo   test doing its job, not the app misbehaving.
echo.
echo   Nothing here touches your real worlds. Every one it opens is
echo   generated in a temporary folder and deleted afterwards.
echo.
echo   Takes about half a minute.
echo.

rem ---------------------------------------------------------------------
rem Same rule as the launchers beside this one: no pnpm. pnpm lives under a
rem redirected %APPDATA% that only exists inside the Claude desktop app's
rem container, and PowerShell refuses to run its .ps1 shim anyway under the
rem default execution policy. Node is in Program Files, and
rem scripts\app-tests.mjs is exactly what "pnpm test:app" would have run.
rem
rem Syntax stays deliberately dull: no for-loops, no delayed expansion, no
rem multi-line blocks. cmd parses batch files by byte offset and a
rem mis-parsed block does not error, it silently makes conditions false.
rem ---------------------------------------------------------------------

set "PATHEXT=.COM;.EXE;.BAT;.CMD;.VBS;.JS;.WSF;.MSC"

if exist "%ProgramFiles%\nodejs" set "PATH=%ProgramFiles%\nodejs;%PATH%"

if exist "%ProgramFiles%\nodejs\node.exe" goto hasnode
echo   Can't run -- Node isn't at "%ProgramFiles%\nodejs".
echo   Install Node from nodejs.org, then try again.
echo.
pause
exit /b 1

:hasnode
if exist "node_modules\electron\index.js" goto haselectron
echo   Can't run -- the project's dependencies aren't installed.
echo   Expected: "%CD%\node_modules\electron".
echo.
echo   Ask Claude to run an install, or run this in a terminal here:
echo     npm install
echo.
pause
exit /b 1

:haselectron

node "scripts\app-tests.mjs"

echo.
if errorlevel 1 goto failed
echo   All good -- every test passed.
echo.
pause
exit /b 0

:failed
echo   Something failed. The lines above say which test and why.
echo.
pause
exit /b 1
