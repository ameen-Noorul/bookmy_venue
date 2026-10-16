$tests = @(
  "test-versioning.js",
  "test-errors.js",
  "test-rbac.js",
  "test-refresh-token.js",
  "test-booking.js",
  "test-booking-ownership.js",
  "tests\test-concurrent-booking.js",
  "test-docs.js",
  "test-realtime.js",
  "test-realtime-emit.js",
  "test-worker-push.js"
)

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

Write-Host "`n===== SUMMARY =====" -ForegroundColor Yellow
$results | Format-Table -AutoSize
$bad = @($results | Where-Object { $_.Result -eq "FAIL" }).Count
Write-Host "$bad failed" -ForegroundColor $(if ($bad) { "Red" } else { "Green" })