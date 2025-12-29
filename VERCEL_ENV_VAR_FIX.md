# ✅ Vercel Environment Variable Fix

## 🔍 **Current Situation:**

### What You Have:
- ✅ `NEXT_PUBLIC_API_URL` - Present
- ❌ `NEXT_PUBLIC_SOCKET_URL` - **NOT present**

### What the Code Does:

**Good News:** The code has a **fallback** for `NEXT_PUBLIC_SOCKET_URL`!

If `NEXT_PUBLIC_SOCKET_URL` is not set, the code will:
1. Try to use `NEXT_PUBLIC_API_URL` and convert it to WebSocket URL
2. Or automatically detect from the current hostname
3. Use `wss://shot-on-me.onrender.com` for production

**So you DON'T need to add it if `NEXT_PUBLIC_API_URL` is correct!**

---

## ✅ **What You Need to Do:**

### Step 1: Verify `NEXT_PUBLIC_API_URL`
1. Go to: https://vercel.com/dashboard
2. Your Project → Settings → Environment Variables
3. Find: `NEXT_PUBLIC_API_URL`
4. **Should be**: `https://shot-on-me.onrender.com/api`
5. If it's `api.shotonme.com`, change it!

### Step 2: Optional - Add `NEXT_PUBLIC_SOCKET_URL` (Not Required)
If you want to be explicit, you can add:
- **Key**: `NEXT_PUBLIC_SOCKET_URL`
- **Value**: `https://shot-on-me.onrender.com`
- **Environments**: Production, Preview, Development

**But this is OPTIONAL** - the code will work without it!

---

## ✅ **Summary:**

**Required:**
- ✅ `NEXT_PUBLIC_API_URL` = `https://shot-on-me.onrender.com/api`

**Optional (has fallback):**
- ⚠️ `NEXT_PUBLIC_SOCKET_URL` = `https://shot-on-me.onrender.com` (optional)

**Action:** Just verify `NEXT_PUBLIC_API_URL` is correct. The socket URL will work automatically!

