@echo off
cd /d "%~dp0backend"
if not exist ".env" (
  copy .env.example .env
  echo Created backend\.env from .env.example. Add API keys later if needed.
)
npm install
npm run dev
pause
