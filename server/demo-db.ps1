# Usage (from the server folder):
#   .\demo-db.ps1          # create/migrate/seed the demo database (safe to re-run)
#   .\demo-db.ps1 -Start   # run the API + worker against the demo database
param([switch]$Start)
$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$envFile = Join-Path $PSScriptRoot '.env'
if (-not (Test-Path $envFile)) { throw ".env not found at $envFile" }

function Get-EnvValue($name) {
  $line = Get-Content $envFile | Where-Object { $_ -match "^\s*$name\s*=" } | Select-Object -First 1
  if (-not $line) { return $null }
  ($line -replace "^\s*$name\s*=\s*", '').Trim().Trim('"').Trim("'")
}

# Use the direct (non-PgBouncer) URL so a brand-new database needs no PgBouncer config.
$base = Get-EnvValue 'DIRECT_URL'
if (-not $base) { $base = Get-EnvValue 'DATABASE_URL' }
if (-not $base) { throw 'Neither DIRECT_URL nor DATABASE_URL found in .env' }

if ($base -match '^(postgres(?:ql)?://[^/]+/)([^?]+)') {
  $demoUrl = $Matches[1] + 'bookmyvenue_demo'
} else {
  throw 'Could not parse the database URL from .env'
}

# These apply to this PowerShell session only; .env is never modified.
$env:DATABASE_URL = $demoUrl
$env:DIRECT_URL   = $demoUrl
Write-Host 'Target database: bookmyvenue_demo'

if (-not $Start) {
  npx prisma migrate deploy
  if ($LASTEXITCODE -ne 0) { throw 'prisma migrate deploy failed' }
  node prisma/seed.js
  if ($LASTEXITCODE -ne 0) { throw 'seed failed' }
  Write-Host "`nDone. Stop your normal API + worker, then run:  .\demo-db.ps1 -Start"
} else {
  Write-Host 'Starting worker + API against the demo database (Ctrl+C to stop)...'
  Start-Process node -ArgumentList 'src/workers/notification.worker.js' -WindowStyle Minimized
  npm run dev
}