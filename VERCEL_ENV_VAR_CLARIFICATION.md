# ✅ Vercel Environment Variables - Clarification

## ✅ **Good News: `NEXT_PUBLIC_SOCKET_URL` is OPTIONAL!**

The code has a **fallback** - if `NEXT_PUBLIC_SOCKET_URL` is not set, it will:
1. Use `NEXT_PUBLIC_API_URL` and convert it automatically
2. Or detect from hostname and use `wss://shot-on-me.onrender.com`

**You don't need to add it!**

---

## ⚠️ **CRITICAL: Check `NEXT_PUBLIC_API_URL`**

### This is the ONE variable that matters:

**Go to Vercel Dashboard:**
1. Settings → Environment Variables
2. Find: `NEXT_PUBLIC_API_URL`
3. **Current value:** What is it set to?
4. **Should be:** `https://shot-on-me.onrender.com/api`

### If it's set to:
- ❌ `https://api.shotonme.com/api` → **CHANGE IT** (custom domain not configured)
- ✅ `https://shot-on-me.onrender.com/api` → **CORRECT!**

---

## 🔧 **Optional: Add `NEXT_PUBLIC_SOCKET_URL` (Not Required)**

If you want to be explicit (optional):
- **Key**: `NEXT_PUBLIC_SOCKET_URL`
- **Value**: `https://shot-on-me.onrender.com`
- **Environments**: Production, Preview, Development

**But this is NOT required** - the code will work without it!

---

## ✅ **Action Required:**

**ONLY check/update:**
- `NEXT_PUBLIC_API_URL` = `https://shot-on-me.onrender.com/api`

**That's it!** The socket URL will work automatically.

---

## 📋 **Summary:**

**Required:**
- ✅ `NEXT_PUBLIC_API_URL` = `https://shot-on-me.onrender.com/api`

**Optional (has fallback):**
- ⚠️ `NEXT_PUBLIC_SOCKET_URL` = Not needed (code handles it)

**Action:** Just verify `NEXT_PUBLIC_API_URL` is correct!

