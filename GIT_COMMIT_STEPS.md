# 📝 Steps to Commit vercel.json to GitHub

## Step-by-Step Instructions

### Step 1: Check if you have Git installed

Open PowerShell and run:
```powershell
git --version
```

If you see a version number (like `git version 2.x.x`), you're good! If not, install Git from: https://git-scm.com/download/win

### Step 2: Navigate to your project folder

```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal
```

### Step 3: Initialize Git (if not already done)

```powershell
git init
```

### Step 4: Check if remote is already set

```powershell
git remote -v
```

**If you see your GitHub URL** (like `https://github.com/kvanpoppel/shot-on-me.git`), skip to Step 6.

**If you see "fatal: not a git repository" or nothing**, continue to Step 5.

### Step 5: Connect to your GitHub repository

```powershell
git remote add origin https://github.com/kvanpoppel/shot-on-me.git
```

**Note:** If your repo uses SSH or a different URL, use that instead.

### Step 6: Check current status

```powershell
git status
```

### Step 7: Add the vercel.json file

```powershell
git add vercel.json
```

### Step 8: Commit the file

```powershell
git commit -m "Fix Vercel build configuration"
```

### Step 9: Push to GitHub

```powershell
git push -u origin main
```

**Note:** If your default branch is `master` instead of `main`, use:
```powershell
git push -u origin master
```

---

## Alternative: If you already have the repo cloned elsewhere

If your GitHub repo is already cloned in a different folder:

1. **Find where your repo is cloned** (maybe in Documents or another folder)
2. **Copy the vercel.json file** to that folder
3. **Then run:**
   ```powershell
   cd [path-to-your-cloned-repo]
   git add vercel.json
   git commit -m "Fix Vercel build configuration"
   git push
   ```

---

## Troubleshooting

### "fatal: not a git repository"
- Run `git init` first (Step 3)

### "remote origin already exists"
- Your repo is already connected, skip Step 5

### "error: failed to push"
- Make sure you're logged into GitHub
- Check if you have write access to the repo
- Try: `git push -u origin main --force` (only if you're sure!)

### "authentication failed"
- You may need to set up GitHub authentication
- Use GitHub Desktop app, or set up SSH keys, or use a personal access token

---

## Quick All-in-One Commands

If you're starting fresh:

```powershell
cd C:\Users\kvanpoppel\shot-on-me-venue-portal
git init
git remote add origin https://github.com/kvanpoppel/shot-on-me.git
git add vercel.json
git commit -m "Fix Vercel build configuration"
git branch -M main
git push -u origin main
```

---

**After pushing, Vercel will automatically detect the change and redeploy! 🚀**

