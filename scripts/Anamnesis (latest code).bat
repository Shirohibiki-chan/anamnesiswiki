@echo off
title Anamnesis - keep this window open
cd /d "%~dp0.."

echo.
echo   Starting Anamnesis with the newest code.
echo.
echo   KEEP THIS BLACK WINDOW OPEN. Closing it closes the app.
echo   The app window takes a few seconds to appear the first time.
echo.

rem This file is deliberately written in the dumbest possible cmd syntax: no
rem for-loops, no delayed expansion, no multi-line blocks, and CRLF endings.
rem Earlier versions used all four and failed on this machine in ways that
rem looked like missing software -- a mis-parsed block makes a condition
rem quietly evaluate false, which is indistinguishable from the file genuinely
rem not being there. Keep it boring. See scripts/README.md.

rem PATHEXT decides which extensions Windows will run. Every npm tool -- pnpm,
rem and tauri inside node_modules\.bin -- is a .cmd, so a PATHEXT that has
rem lost .CMD hides all of them while they sit right there on disk.
set "PATHEXT=.COM;.EXE;.BAT;.CMD;.VBS;.JS;.WSF;.MSC"

rem A double-clicked shortcut inherits the environment Explorer captured at
rem sign-in, so PATH here can lack anything installed since. Added by
rem existence check rather than searched for with `where`.
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

echo   Can't start -- pnpm wasn't found. Looked in:
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

rem Best-effort: silently skipped with no internet, nothing to pull, or local
rem edits a fast-forward would overwrite. None should stop the app opening.
git pull --ff-only >nul 2>&1

rem Keeps node_modules in step when dependencies changed since last launch.
call "%PNPM%" install --frozen-lockfile --prefer-offline >nul 2>&1

call "%PNPM%" tauri dev

if not errorlevel 1 exit /b 0
echo.
echo   Anamnesis stopped with an error. The message above says why.
echo.
pause
exit /b 1
