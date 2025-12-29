# How to Restart localhost:3001 (Shot On Me App)

## Quick Restart

### Option 1: Using the Start Script
From the project root directory, run:
```powershell
.\start-shot-on-me.ps1
```

### Option 2: Manual Start
1. Open a new PowerShell terminal
2. Navigate to the shot-on-me directory:
   ```powershell
   cd shot-on-me
   ```
3. Start the server:
   ```powershell
   npm run dev
   ```

### Option 3: If Server is Already Running
If the server is running but you want to restart it:

1. **Find the process:**
   ```powershell
   netstat -ano | findstr ":3001" | findstr "LISTENING"
   ```
   This will show the PID (process ID)

2. **Kill the process:**
   ```powershell
   taskkill /PID <PID_NUMBER> /F
   ```
   Replace `<PID_NUMBER>` with the actual PID from step 1

3. **Restart:**
   ```powershell
   cd shot-on-me
   npm run dev
   ```

## What You Should See

When the server starts successfully, you'll see:
```
▲ Next.js 14.x.x
- Local:        http://localhost:3001
- Ready in X seconds
```

## Troubleshooting

- **Port already in use**: Kill the process using the steps above
- **Module not found**: Run `npm install` in the `shot-on-me` directory
- **Build errors**: Check the console output for specific errors


