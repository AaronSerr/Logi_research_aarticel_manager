# Kill all Node.js processes
Write-Host "Killing existing Node.js processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 2

# Start the application
Write-Host "Starting application..." -ForegroundColor Green
npm run start
