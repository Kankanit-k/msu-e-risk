# deploy-mui-template.ps1
# This script automates the deployment of the MUI Template and Backend on Windows Server.

$ROOT_DIR = Get-Location
$BACKEND_DIR = Join-Path $ROOT_DIR "backend"
$FRONTEND_DIR = $ROOT_DIR

Write-Host "--- Starting Deployment of MUI Template System ---" -ForegroundColor Cyan

# 1. Environment Check
Write-Host "--- Checking Environment ---" -ForegroundColor Cyan
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Error "npm is not installed. Please install Node.js first."
    exit 1
}

# Install PM2 and ts-node globally if not present
$globalPackages = @()
if (!(Get-Command pm2 -ErrorAction SilentlyContinue)) { $globalPackages += "pm2" }
if (!(Get-Command ts-node -ErrorAction SilentlyContinue)) { $globalPackages += "ts-node", "typescript" }

if ($globalPackages) {
    Write-Host "Installing missing global packages: $($globalPackages -join ', ')..." -ForegroundColor Yellow
    npm install -g $globalPackages
}

# 2. Setup Backend
Write-Host "`n[1/2] Initializing Backend (Prisma & Deps)..." -ForegroundColor Green
Set-Location $BACKEND_DIR
npm install --production
Write-Host "Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate
Write-Host "Starting Backend with PM2..." -ForegroundColor Cyan
pm2 delete mui-backend-api -ErrorAction SilentlyContinue 
pm2 start index.ts --name mui-backend-api --interpreter ts-node
Write-Host "Backend initialized and started." -ForegroundColor Green

# 3. Setup Frontend
Write-Host "`n[2/2] Initializing Frontend (Deps & Build)..." -ForegroundColor Green
Set-Location $FRONTEND_DIR
npm install --production
Write-Host "Building Next.js project (this may take a minute)..." -ForegroundColor Cyan
npm run build
Write-Host "Starting Frontend with PM2..." -ForegroundColor Cyan
pm2 delete mui-frontend -ErrorAction SilentlyContinue
pm2 start npm --name mui-frontend -- start -- --port 3000
Write-Host "Frontend initialized and started." -ForegroundColor Green

# 4. Save PM2 state
pm2 save

Write-Host "`n--- Deployment Complete! ---" -ForegroundColor Green
Write-Host "Backend: http://localhost:3001"
Write-Host "Frontend: http://localhost:3000"
Write-Host "Remember to configure IIS Reverse Proxy as per the deployment_guide.md" -ForegroundColor Yellow

Set-Location $ROOT_DIR
