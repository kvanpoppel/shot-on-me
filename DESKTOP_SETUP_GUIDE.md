# 🖥️ Desktop Setup Guide for Shot On Me Project

## 📋 Best Options for Desktop Setup

### **Option 1: Full Local Development (Recommended)**
**Best for:** Full control, offline work, fastest development

**Requirements:**
- Node.js 18+ installed
- MongoDB (local or Atlas)
- Git installed
- Code editor (VS Code recommended)

**Steps:**
1. Clone repository
2. Install dependencies (`npm install` in each directory)
3. Set up `.env` files
4. Start all 4 servers

**Pros:**
- Fastest development
- Works offline
- Full control
- No cloud costs

**Cons:**
- Need to install MongoDB locally (or use Atlas)
- More initial setup

---

### **Option 2: Cloud Development Environment**
**Best for:** Quick setup, no local installs, team collaboration

**Options:**
- **GitHub Codespaces** (VS Code in browser)
- **Gitpod** (VS Code in browser)
- **Replit** (browser-based IDE)
- **AWS Cloud9** (cloud IDE)

**Pros:**
- No local installation needed
- Access from any computer
- Pre-configured environments
- Easy to share

**Cons:**
- Requires internet
- May have usage limits/costs
- Slightly slower than local

---

### **Option 3: Remote Desktop to Existing Setup**
**Best for:** Using your current setup from desktop

**Options:**
- **Windows Remote Desktop** (if Windows)
- **TeamViewer / AnyDesk** (cross-platform)
- **Chrome Remote Desktop** (simple)
- **SSH + VS Code Remote** (advanced)

**Pros:**
- Use existing setup
- No reconfiguration needed
- Access from anywhere

**Cons:**
- Requires current computer to be on
- Network dependent
- May be slower

---

## 🎯 Recommended: Option 1 (Local Development)

### **Step-by-Step Desktop Setup:**

#### **1. Install Prerequisites**

**Node.js:**
- Download from: https://nodejs.org/
- Install LTS version (18.x or 20.x)
- Verify: `node --version` and `npm --version`

**Git:**
- Download from: https://git-scm.com/
- Verify: `git --version`

**VS Code:**
- Download from: https://code.visualstudio.com/
- Install recommended extensions:
  - ESLint
  - Prettier
  - MongoDB for VS Code
  - Thunder Client (API testing)

**MongoDB (Choose one):**
- **Option A:** MongoDB Atlas (Cloud - Free tier)
  - Sign up at: https://www.mongodb.com/cloud/atlas
  - Create free cluster
  - Get connection string
- **Option B:** MongoDB Local
  - Download from: https://www.mongodb.com/try/download/community
  - Install and run locally

---

#### **2. Clone Repository**

```powershell
# Clone the repository
git clone <your-repo-url>
cd shot-on-me-venue-portal
```

---

#### **3. Install Dependencies**

```powershell
# Backend
cd backend
npm install

# Shot On Me App
cd ../shot-on-me
npm install

# Venue Portal
cd ../venue-portal
npm install

# Owner Portal
cd ../owner-portal
npm install
```

---

#### **4. Set Up Environment Files**

**Backend `.env`:**
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Shot On Me `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key
```

**Venue Portal `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

**Owner Portal `.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

#### **5. Start All Servers**

**Option A: Manual (4 PowerShell windows)**
```powershell
# Window 1: Backend
cd backend
npm run dev

# Window 2: Shot On Me
cd shot-on-me
npm run dev

# Window 3: Venue Portal
cd venue-portal
npm run dev

# Window 4: Owner Portal
cd owner-portal
npm run dev
```

**Option B: Use the restart scripts**
- `backend/restart-backend.ps1`
- Create similar scripts for other apps

---

## 🚀 Quick Start Script (Create This)

**Create `start-all.ps1` in project root:**

```powershell
# Start All Servers Script
Write-Host "🚀 Starting All Servers..." -ForegroundColor Cyan

# Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; Write-Host '🚀 Backend (Port 5000)' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

# Shot On Me
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\shot-on-me'; Write-Host '🚀 Shot On Me (Port 3001)' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

# Venue Portal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\venue-portal'; Write-Host '🚀 Venue Portal (Port 3000)' -ForegroundColor Cyan; npm run dev"

Start-Sleep -Seconds 2

# Owner Portal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\owner-portal'; Write-Host '🚀 Owner Portal (Port 3002)' -ForegroundColor Cyan; npm run dev"

Write-Host "✅ All servers starting!" -ForegroundColor Green
Write-Host "   Wait 15-20 seconds for all to start" -ForegroundColor Yellow
```

---

## 📦 What to Copy from Current Setup

**Essential Files:**
- `.env` files (with all API keys)
- `package.json` files (already in repo)
- Any custom configuration

**Not Needed:**
- `node_modules/` (will be reinstalled)
- `.next/` folders (will be rebuilt)
- Log files

---

## 🔧 VS Code Workspace Setup

**Create `.vscode/settings.json`:**
```json
{
  "files.exclude": {
    "**/node_modules": true,
    "**/.next": true
  },
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true
  }
}
```

**Create `shot-on-me.code-workspace`:**
```json
{
  "folders": [
    { "path": "backend" },
    { "path": "shot-on-me" },
    { "path": "venue-portal" },
    { "path": "owner-portal" }
  ],
  "settings": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

---

## ✅ Verification Checklist

After setup, verify:
- [ ] Node.js installed (`node --version`)
- [ ] Git installed (`git --version`)
- [ ] MongoDB accessible (connection string works)
- [ ] All dependencies installed (`npm install` in each directory)
- [ ] All `.env` files configured
- [ ] All 4 servers start without errors
- [ ] Can access:
  - Backend: http://localhost:5000/api
  - Shot On Me: http://localhost:3001
  - Venue Portal: http://localhost:3000
  - Owner Portal: http://localhost:3002

---

## 💡 Pro Tips

1. **Use VS Code Multi-root Workspace** - Open all 4 projects at once
2. **Use Terminal Tabs** - VS Code can run all 4 servers in separate tabs
3. **Create npm scripts** - Add `start:all` script to run everything
4. **Use Docker** (Advanced) - Containerize for consistent environment
5. **Use .env.example files** - Document required environment variables

---

## 🆘 Troubleshooting

**Port already in use:**
```powershell
# Find and kill process
Get-NetTCPConnection -LocalPort 5000 | Select-Object -ExpandProperty OwningProcess | Stop-Process -Force
```

**Dependencies not installing:**
- Check Node.js version (need 18+)
- Clear npm cache: `npm cache clean --force`
- Delete `node_modules` and `package-lock.json`, then reinstall

**MongoDB connection issues:**
- Verify connection string
- Check firewall settings
- For Atlas: Whitelist your IP address

---

## 📝 Summary

**Best Option: Local Development (Option 1)**
- Most control
- Fastest development
- Works offline
- Standard development workflow

**Quick Setup Time:** ~30-60 minutes
**Ongoing:** Just run `npm run dev` in each directory

