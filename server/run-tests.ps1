$tests = @(
  "test-versioning.js",
  "test-errors.js",
  "test-cors.js",
  "test-rbac.js",
  "test-refresh-token.js",
  "test-venue-routes.js",
  "test-admin-routes.js",
  "test-booking.js",
  "test-booking-ownership.js",
  "tests\test-concurrent-booking.js",
  "test-docs.js",
  "test-realtime.js",
  "test-realtime-emit.js",
  "test-worker-push.js",
  "test-notifications-flow.js",
  "test-ban-enforcement.js"
)

# 1. The API must be up.
try {
  Invoke-WebRequest -Uri "http://localhost:5000/health" -UseBasicParsing -TimeoutSec 5 | Out-Null
} catch {
  Write-Host "The API is not reachable on http://localhost:5000. Start it with: npm run dev" -ForegroundColor Red
  exit 1
}

# 2. Exactly one notification worker must be running. Start one if there is none.
$workerProc = $null
$running = @(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match 'notification.worker' })
if ($running.Count -eq 0) {
  Write-Host "No notification worker running: starting one for the tests..." -ForegroundColor Yellow
  $workerProc = Start-Process node -ArgumentList "src/workers/notification.worker.js" -WorkingDirectory $PSScriptRoot -PassThru -WindowStyle Hidden
  Start-Sleep -Seconds 4
} elseif ($running.Count -gt 1) {
  Write-Host "$($running.Count) workers are running. Stop the extras so tests are reliable." -ForegroundColor Red
  exit 1
} else {
  Write-Host "Using the notification worker that is already running." -ForegroundColor Green
}

# 3. Run each test, one at a time.
$results = @()
foreach ($t in $tests) {
  if (-not (Test-Path $t)) {
    $results += [pscustomobject]@{ Test = $t; Result = "SKIPPED (file not found)" }
    continue
  }
  Write-Host "`n=== $t ===" -ForegroundColor Cyan
  node $t 2>&1 | Tee-Object -Variable out | Out-Host
  $code = $LASTEXITCODE
  $sawFail = (($out -join "`n") -match '(?m)^\s*FAIL\b')
  $status = if ($code -ne 0 -or $sawFail) { "FAIL" } else { "PASS" }
  $results += [pscustomobject]@{ Test = $t; Result = $status }
  Start-Sleep -Seconds 3   # breathing room for the auth rate limiter
}

# 4. Stop the worker only if this script started it.
if ($workerProc) {
  Stop-Process -Id $workerProc.Id -Force -ErrorAction SilentlyContinue
  Write-Host "`nStopped the temporary worker." -ForegroundColor Yellow
}

Write-Host "`n===== SUMMARY =====" -ForegroundColor Yellow
$results | Format-Table -AutoSize
$bad = @($results | Where-Object { $_.Result -eq "FAIL" }).Count
Write-Host "$bad failed" -ForegroundColor $(if ($bad) { "Red" } else { "Green" })