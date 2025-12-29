# How to Use Browser DevTools (Developer Tools)

## What is DevTools?
DevTools is a built-in browser tool that helps developers see what's happening on a webpage - errors, network requests, and more.

## How to Open DevTools

### Chrome/Edge (Most Common)
- **Press `F12`** on your keyboard
- OR right-click anywhere on the page → select **"Inspect"** or **"Inspect Element"**
- OR press `Ctrl + Shift + I` (Windows) / `Cmd + Option + I` (Mac)

### Firefox
- **Press `F12`**
- OR right-click → **"Inspect Element"**
- OR `Ctrl + Shift + I` (Windows) / `Cmd + Option + I` (Mac)

### Safari
- First enable it: Safari menu → Preferences → Advanced → Check "Show Develop menu"
- Then press `Cmd + Option + I`

## What You'll See

When DevTools opens, you'll see tabs at the top:
- **Console** - Shows errors and messages (this is what we need!)
- **Network** - Shows all files loading (for clearing cache)
- **Elements** - Shows the HTML code
- **Application** - Shows stored data (cookies, cache, etc.)

## For Our Task: Clear Cache

### Simple Method:
1. **Press `F12`** to open DevTools
2. Click the **"Network"** tab at the top
3. Check the box that says **"Disable cache"** (at the top of the Network tab)
4. **Keep DevTools open** while testing
5. Press **`Ctrl + Shift + R`** to hard refresh the page

### Visual Guide:
```
┌─────────────────────────────────────┐
│  Network  │  Console  │  Elements  │  ← Tabs at top
├─────────────────────────────────────┤
│ ☑ Disable cache  ← CHECK THIS BOX  │
│                                     │
│  [List of files loading...]         │
└─────────────────────────────────────┘
```

## Check for Errors

1. Click the **"Console"** tab
2. Look for any **red error messages**
3. If you see errors, take a screenshot or copy the text

## That's It!

Once DevTools is open with "Disable cache" checked, just refresh the page and test adding a credit card!



