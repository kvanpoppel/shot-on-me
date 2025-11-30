# Check Render MongoDB Connection
# This script helps verify MongoDB is configured in Render

Write-Host "🔍 MongoDB Setup Verification" -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Steps to Verify MongoDB in Render:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Go to: https://dashboard.render.com" -ForegroundColor White
Write-Host "2. Click on your backend service (shot-on-me-backend)" -ForegroundColor White
Write-Host "3. Click 'Environment' tab" -ForegroundColor White
Write-Host "4. Look for MONGODB_URI variable" -ForegroundColor White
Write-Host ""
Write-Host "Expected value:" -ForegroundColor Green
Write-Host "mongodb+srv://katevanpoppel_db_user:ws0HmJskZzm6yvtW@cluster0.uoylpxu.mongodb.net/shotonme?retryWrites=true&w=majority" -ForegroundColor Gray
Write-Host ""

Write-Host "5. Check Logs tab for connection status:" -ForegroundColor White
Write-Host "   ✅ Look for: 'Connected to MongoDB'" -ForegroundColor Green
Write-Host "   ❌ If you see errors, check troubleshooting below" -ForegroundColor Red
Write-Host ""

Write-Host "6. Test API endpoint:" -ForegroundColor White
Write-Host "   https://shot-on-me.onrender.com/api/health" -ForegroundColor Cyan
Write-Host ""

Write-Host "Expected response:" -ForegroundColor Yellow
Write-Host '   {"status":"ok","database":"Connected",...}' -ForegroundColor Gray
Write-Host ""

Write-Host "📝 MongoDB Atlas Checklist:" -ForegroundColor Yellow
Write-Host "   [ ] Network Access allows 0.0.0.0/0 (or Render IPs)" -ForegroundColor White
Write-Host "   [ ] Database user 'katevanpoppel_db_user' exists" -ForegroundColor White
Write-Host "   [ ] Password is correct" -ForegroundColor White
Write-Host "   [ ] User has 'Atlas Admin' privileges" -ForegroundColor White
Write-Host ""

Write-Host "🆘 Common Issues:" -ForegroundColor Red
Write-Host "   • 'Authentication failed' → Wrong password" -ForegroundColor White
Write-Host "   • 'Connection timeout' → IP not whitelisted" -ForegroundColor White
Write-Host "   • 'bad auth' → User lacks permissions" -ForegroundColor White
Write-Host ""

Write-Host "📚 See verify-mongodb-setup.md for detailed troubleshooting" -ForegroundColor Cyan
Write-Host ""

