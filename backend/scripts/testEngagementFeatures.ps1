$API_URL = "http://localhost:5000/api"
$authToken = $null
$testUserId = $null

$TEST_EMAIL = "test@example.com"
$TEST_PASSWORD = "test123456"

function Test-Endpoint {
    param(
        [string]$Name,
        [string]$Method,
        [string]$Url,
        [object]$Body = $null,
        [hashtable]$Headers = @{}
    )
    
    Write-Host "🧪 Testing $Name..." -ForegroundColor Blue
    
    try {
        $params = @{
            Method = $Method
            Uri = "$API_URL$Url"
            Headers = @{
                'Content-Type' = 'application/json'
            }
        }
        
        foreach ($key in $Headers.Keys) {
            $params.Headers[$key] = $Headers[$key]
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json)
        }
        
        $response = Invoke-RestMethod @params -ErrorAction Stop
        Write-Host "✅ $Name`: Success" -ForegroundColor Green
        return @{ success = $true; data = $response }
    }
    catch {
        $statusCode = $_.Exception.Response.StatusCode.value__
        $errorMessage = $_.ErrorDetails.Message
        if ($statusCode) {
            Write-Host "❌ $Name`: Status $statusCode" -ForegroundColor Red
        } else {
            Write-Host "❌ $Name`: $($_.Exception.Message)" -ForegroundColor Red
        }
        return @{ success = $false; status = $statusCode; error = $errorMessage }
    }
}

Write-Host "`n🚀 Starting Engagement Features Test Suite`n" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

# 1. Health Check
Write-Host "`n📋 1. Health Check" -ForegroundColor Yellow
$health = Test-Endpoint -Name "Health Check" -Method "GET" -Url "/health"

# 2. Authentication
Write-Host "`n📋 2. Authentication" -ForegroundColor Yellow
$loginResult = Test-Endpoint -Name "Login" -Method "POST" -Url "/auth/login" -Body @{
    email = $TEST_EMAIL
    password = $TEST_PASSWORD
}

if ($loginResult.success) {
    $authToken = $loginResult.data.token
    $testUserId = $loginResult.data.user.id
    Write-Host "✅ Authentication successful!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Login failed, attempting registration..." -ForegroundColor Cyan
    $registerResult = Test-Endpoint -Name "Register" -Method "POST" -Url "/auth/register" -Body @{
        email = $TEST_EMAIL
        password = $TEST_PASSWORD
        name = "Test User"
        firstName = "Test"
        lastName = "User"
        phoneNumber = "+1234567890"
    }
    
    if ($registerResult.success) {
        $authToken = $registerResult.data.token
        $testUserId = $registerResult.data.user.id
        Write-Host "✅ Registration successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Cannot proceed without authentication" -ForegroundColor Red
        exit
    }
}

$authHeaders = @{ Authorization = "Bearer $authToken" }

# 3. Gamification
Write-Host "`n📋 3. Gamification System" -ForegroundColor Yellow
Test-Endpoint -Name "Get Stats" -Method "GET" -Url "/gamification/stats" -Headers $authHeaders
Test-Endpoint -Name "Get Badges" -Method "GET" -Url "/gamification/badges" -Headers $authHeaders
Test-Endpoint -Name "Check Badges" -Method "POST" -Url "/gamification/check-badges" -Headers $authHeaders
Test-Endpoint -Name "Leaderboard - Generous" -Method "GET" -Url "/gamification/leaderboards?type=generous" -Headers $authHeaders
Test-Endpoint -Name "Leaderboard - Active" -Method "GET" -Url "/gamification/leaderboards?type=active" -Headers $authHeaders
Test-Endpoint -Name "Leaderboard - Points" -Method "GET" -Url "/gamification/leaderboards?type=points" -Headers $authHeaders

# 4. Referrals
Write-Host "`n📋 4. Referral System" -ForegroundColor Yellow
Test-Endpoint -Name "Get Referral Code" -Method "GET" -Url "/referrals/code" -Headers $authHeaders
Test-Endpoint -Name "Get Referral History" -Method "GET" -Url "/referrals/history" -Headers $authHeaders

# 5. Rewards
Write-Host "`n📋 5. Rewards System" -ForegroundColor Yellow
Test-Endpoint -Name "Get Rewards" -Method "GET" -Url "/rewards" -Headers $authHeaders
Test-Endpoint -Name "Get My Rewards" -Method "GET" -Url "/rewards/my-rewards" -Headers $authHeaders

# 6. Tonight
Write-Host "`n📋 6. Tonight Discovery" -ForegroundColor Yellow
$tonightUrl = '/tonight?latitude=40.7128&longitude=-74.0060'
Test-Endpoint -Name "Tonight Feed" -Method "GET" -Url $tonightUrl -Headers $authHeaders

# 7. Events
Write-Host "`n📋 7. Events System" -ForegroundColor Yellow
Test-Endpoint -Name "Get Events" -Method "GET" -Url "/events" -Headers $authHeaders
Test-Endpoint -Name "Get Upcoming Events" -Method "GET" -Url "/events?upcoming=true" -Headers $authHeaders
Test-Endpoint -Name "Get Tonight Events" -Method "GET" -Url "/events?tonight=true" -Headers $authHeaders

# 8. Final Stats Check
Write-Host "`n📋 8. Integration Test" -ForegroundColor Yellow
$finalStats = Test-Endpoint -Name "Get Stats Again" -Method "GET" -Url "/gamification/stats" -Headers $authHeaders
if ($finalStats.success) {
    Write-Host "ℹ️  Current Points: $($finalStats.data.points)" -ForegroundColor Cyan
    Write-Host "ℹ️  Total Sent: `$$($finalStats.data.totalSent)" -ForegroundColor Cyan
    Write-Host "ℹ️  Total Received: `$$($finalStats.data.totalReceived)" -ForegroundColor Cyan
    Write-Host "ℹ️  Total Check-ins: $($finalStats.data.totalCheckIns)" -ForegroundColor Cyan
    Write-Host "ℹ️  Badges Unlocked: $($finalStats.data.badgesUnlocked)" -ForegroundColor Cyan
}

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "`n🎉 Test Suite Complete!`n" -ForegroundColor Green

