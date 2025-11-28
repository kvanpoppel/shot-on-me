# Troubleshooting Guide

Common issues and solutions for Shot On Me & Venue Portal.

## 🚨 Common Issues

### Backend Won't Start

**Error: "Cannot find module"**
```bash
# Solution: Install dependencies
cd backend
npm install
```

**Error: "MongoDB connection failed"**
- Make sure MongoDB is running locally, OR
- Update `backend/.env` with MongoDB Atlas connection string
- Check `MONGODB_URI` in your `.env` file

**Error: "Port 5000 already in use"**
```powershell
# Find and kill the process
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Or change the port in backend/.env
PORT=5001
```

### Frontend Won't Start

**Error: "Port 3000 already in use"**
- Next.js will automatically use the next available port (3001, 3002, etc.)
- Or manually specify: `PORT=3001 npm run dev`

**Error: "Module not found"**
```bash
# Solution: Install dependencies
cd venue-portal  # or shot-on-me
npm install
```

**Error: "API connection failed"**
- Make sure backend is running on port 5000
- Check `NEXT_PUBLIC_API_URL` in `.env.local`
- Verify CORS is enabled in backend

### Database Issues

**MongoDB Connection Error**
1. **Local MongoDB:**
   ```powershell
   # Check if MongoDB is running
   Get-Service MongoDB
   
   # Start MongoDB service
   Start-Service MongoDB
   ```

2. **MongoDB Atlas:**
   - Make sure your IP is whitelisted
   - Check connection string format
   - Verify username/password are correct

**"Collection not found" errors**
- This is normal on first run
- Collections are created automatically when you use them
- Make sure you've registered at least one user

### Authentication Issues

**"Invalid token" errors**
- Clear browser localStorage
- Log out and log back in
- Check JWT_SECRET in backend/.env matches

**"User not found" errors**
- Make sure you've registered a user first
- Check MongoDB connection
- Verify user exists in database

### Payment/SMS Issues

**SMS not sending**
- Check Twilio credentials in `backend/.env`
- Verify Twilio account has credits
- Check phone number format (+1234567890)

**Payment codes not working**
- Make sure payment status is "active"
- Check expiration date hasn't passed
- Verify venue ID is correct

### Map/Location Issues

**Map not loading**
- Check Google Maps API key in `shot-on-me/.env.local`
- Verify API key has Maps JavaScript API enabled
- Check browser console for errors

**Location not updating**
- Grant location permissions in browser
- Check HTTPS (required for geolocation in production)
- Verify location API is enabled

## 🔧 Quick Fixes

### Reset Everything
```powershell
# Stop all services (Ctrl+C in each window)

# Clear node_modules and reinstall
cd backend
Remove-Item -Recurse -Force node_modules
npm install

cd ..\venue-portal
Remove-Item -Recurse -Force node_modules
npm install

cd ..\shot-on-me
Remove-Item -Recurse -Force node_modules
npm install
```

### Check All Services
```powershell
# Run the check script
.\check-setup.ps1
```

### View Logs
- Backend logs appear in the terminal where you ran `npm run dev`
- Frontend logs appear in browser console (F12)
- Check terminal output for error messages

## 📞 Getting Help

1. **Check the logs** - Error messages usually tell you what's wrong
2. **Run check-setup.ps1** - Verifies your configuration
3. **Check .env files** - Make sure all required values are set
4. **Verify dependencies** - Run `npm install` in each directory
5. **Check MongoDB** - Make sure database is accessible

## 🐛 Still Having Issues?

1. Make sure all `.env` files are created
2. Verify all dependencies are installed
3. Check that MongoDB is running/accessible
4. Ensure ports 5000, 3000, 3001 are available
5. Review error messages in terminal/browser console

## ✅ Verification Checklist

- [ ] Node.js installed (v18+)
- [ ] npm installed
- [ ] MongoDB running or Atlas configured
- [ ] All `.env` files created
- [ ] Dependencies installed (`npm install` in each folder)
- [ ] Backend starts without errors
- [ ] Frontend apps start without errors
- [ ] Can access http://localhost:5000/api/health


