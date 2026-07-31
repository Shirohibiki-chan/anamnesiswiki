@echo off
setlocal enabledelayedexpansion
title Anamnesis - keep this window open
cd /d "%~dp0.."

echo.
echo   Starting Anamnesis with the newest code.
echo.
echo   KEEP THIS BLACK WINDOW OPEN. Closing it closes the app.
echo   The app window takes a few seconds to appear the first time.
echo.

rem ---------------------------------------------------------------------
rem A double-clicked shortcut inherits the environment Explorer captured at
rem sign-in, so PATH here can be missing tools that are installed and
rem registered perfectly well. Two earlier versions of this script tried to
rem repair PATH and then confirm with `where`; both still failed on this
rem machine. So nothing is searched for by name any more -- pnpm is invoked
rem by full path, and the directories that pnpm and Tauri themselves need on
rem PATH (node, cargo) are added by existence check alone.
rem ---------------------------------------------------------------------

rem PATHEXT decides which extensions Windows treats as runnable. pnpm, tauri
rem and every other npm tool ship as .cmd, so a PATHEXT that has lost .CMD
rem makes them invisible while they sit right there on disk -- and it breaks
rem `where` and pnpm's own node_modules\.bin lookup identically. Pinned to
rem the Windows default rather than trusted.
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
  echo   Can't start -- pnpm wasn't found. Looked in:
  echo     %APPDATA%\npm\pnpm.cmd
  echo     %USERPROFILE%\AppData\Roaming\npm\pnpm.cmd
  echo     %LOCALAPPDATA%\pnpm\pnpm.exe
  echo     %ProgramFiles%\nodejs\pnpm.cmd
  echo.
  echo   Send this list to Claude -- one of those paths is wrong for this PC.
  echo.
  pause
  exit /b 1
)

if not exist "%ProgramFiles%\nodejs\node.exe" (
  echo   Can't start -- Node isn't at %ProgramFiles%\nodejs. Tell Claude.
  echo.
  pause
  exit /b 1
)

if not exist "%USERPROFILE%\.cargo\bin\cargo.exe" (
  echo   Can't start -- Rust isn't at %USERPROFILE%\.cargo\bin. Tell Claude.
  echo.
  pause
  exit /b 1
)

rem Best-effort: skipped silently with no internet, nothing to pull, or local
rem edits a fast-forward would overwrite. None should block the app opening.
git pull --ff-only >nul 2>&1

rem Keeps node_modules in step when dependencies changed since last launch.
call "%PNPM%" install --frozen-lockfile --prefer-offline >nul 2>&1

call "%PNPM%" tauri dev

if errorlevel 1 (
  echo.
  echo   Anamnesis stopped with an error. The message above says why.
  echo.
  pause
)
exit /b 0
