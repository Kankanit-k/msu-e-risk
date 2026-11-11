# package.ps1
# Creates a compressed tar.gz archive of the project using PowerShell.

$OutputFile = "mui-template.tar.gz"

Write-Host "Packaging project into $OutputFile..." -ForegroundColor Cyan

# Using tar (which is available in modern Windows/PowerShell)
tar -czf $OutputFile `
  --exclude=$OutputFile `
  --exclude='node_modules' `
  --exclude='.git' `
  --exclude='.next' `
  --exclude='backend/node_modules' `
  --exclude='backend/dist' `
  .

Write-Host "Done! Archive created: $OutputFile" -ForegroundColor Green
