# Test Engagement Endpoints
Write-Host "`n=== Testing Engagement Endpoints ===`n" -ForegroundColor Cyan

# Create test user
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$email = "test$timestamp@test.com"
$body = @{
    email = $email
    password = "test123456"
    fullName = "Test User"
    phoneNumber = "1234567890"
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $body -ContentType "application/json"
    $json = $response.Content | ConvertFrom-Json
    $token = $json.token
    Write-Host "✅ Test user created: $email" -ForegroundColor Green
} catch {
    Write-Host "⚠️  User creation failed, trying login..." -ForegroundColor Yellow
    $loginBody = @{
        email = "testuser@test.com"
        password = "test123456"
    } | ConvertTo-Json
    try {
        $loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
        $loginJson = $loginResponse.Content | ConvertFrom-Json
        $token = $loginJson.token
        Write-Host "✅ Logged in as existing user" -ForegroundColor Green
    } catch {
        Write-Host "❌ Could not authenticate. Please create a user manually." -ForegroundColor Red
        exit
    }
}

$headers = @{
    "Authorization" = "Bearer $token"
}

# Test endpoints
$endpoints = @(
    @{ Name = "Gamification Stats"; Url = "http://localhost:5000/api/gamification/stats" },
    @{ Name = "Badges"; Url = "http://localhost:5000/api/gamification/badges" },
    @{ Name = "Leaderboards"; Url = "http://localhost:5000/api/gamification/leaderboards?type=generous" },
    @{ Name = "Referral Code"; Url = "http://localhost:5000/api/referrals/code" },
    @{ Name = "Rewards"; Url = "http://localhost:5000/api/rewards" },
    @{ Name = "Tonight Feed"; Url = "http://localhost:5000/api/tonight" },
    @{ Name = "Events"; Url = "http://localhost:5000/api/events" }
)

$passed = 0
$failed = 0

foreach ($endpoint in $endpoints) {
    Write-Host "Testing: $($endpoint.Name)..." -ForegroundColor Yellow -NoNewline
    try {
        $response = Invoke-WebRequest -Uri $endpoint.Url -Method GET -Headers $headers -ErrorAction Stop
        Write-Host " ✅ PASS" -ForegroundColor Green
        $passed++
    } catch {
        Write-Host " ❌ FAIL - $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host "`n=== Test Results ===" -ForegroundColor Cyan
Write-Host "✅ Passed: $passed" -ForegroundColor Green
Write-Host "❌ Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Red" })
Write-Host "`n"

