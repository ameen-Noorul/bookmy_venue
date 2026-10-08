# start-deps.ps1
# Starts Redis + PgBouncer via Docker before dev work.
# Run this once per session: .\start-deps.ps1

Write-Host "Starting Redis + PgBouncer (Docker)..." -ForegroundColor Cyan
docker compose up -d redis pgbouncer

Start-Sleep -Seconds 2

Write-Host "Checking Redis container status..." -ForegroundColor Cyan
$redisStatus = docker compose ps redis --format json | ConvertFrom-Json
if ($redisStatus.State -eq "running") {
    Write-Host "Redis is up." -ForegroundColor Green
} else {
    Write-Host "Redis FAILED to start. Run 'docker compose logs redis' to investigate." -ForegroundColor Red
    exit 1
}

Write-Host "Checking PgBouncer container status..." -ForegroundColor Cyan
$pgbouncerStatus = docker compose ps pgbouncer --format json | ConvertFrom-Json
if ($pgbouncerStatus.State -eq "running") {
    Write-Host "PgBouncer is up." -ForegroundColor Green
} else {
    Write-Host "PgBouncer FAILED to start. Run 'docker compose logs pgbouncer' to investigate." -ForegroundColor Red
    exit 1
}

Write-Host "Checking native Postgres service..." -ForegroundColor Cyan
$pgService = Get-Service -Name "*postgres*" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -eq "Running") {
    Write-Host "Postgres is up." -ForegroundColor Green
} else {
    Write-Host "WARNING: Could not confirm native Postgres service is running. Check manually with Get-Service -Name '*postgres*'." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "All dependencies checked. Safe to run 'npm run dev' now." -ForegroundColor Green