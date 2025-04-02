@echo off
REM Script to start the server with localhost configuration
REM This helps avoid the ENOTSUP error on Windows systems

REM Set environment variables
set NODE_ENV=development

REM Start the server using the tsx compiler
npx tsx server/index.ts