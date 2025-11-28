# 🌐 GoDaddy DNS Setup for Vercel

## Step-by-Step Instructions

### Step 1: Get Your Vercel DNS Records

First, you need to get the DNS records from Vercel:

1. **Go to your Vercel project dashboard**
2. **Click on "Settings" → "Domains"**
3. **Add your domain:**
   - Click "Add Domain"
   - Enter: `www.shotonme.com`
   - Click "Add"
4. **Vercel will show you DNS instructions:**
   - It will tell you to add a **CNAME** record for `www`
   - The value will be something like: `cname.vercel-dns.com`
   - Or it might give you an **A record** with an IP address

### Step 2: Update GoDaddy DNS Records

#### Option A: If Vercel gives you a CNAME (Most Common)

1. **In GoDaddy DNS Management, click "Add a new record"**

2. **For www subdomain:**
   - **Type:** Select `CNAME`
   - **Name:** Enter `www`
   - **Value:** Enter the CNAME value from Vercel (e.g., `cname.vercel-dns.com`)
   - **TTL:** Select `1 Hour` (or default)
   - Click **"Save"**

3. **For root domain (@):**
   - **Type:** Select `A`
   - **Name:** Enter `@` (or leave blank for root)
   - **Value:** Enter the IP address Vercel provides (usually `76.76.21.21` or similar - check Vercel dashboard)
   - **TTL:** Select `1 Hour`
   - Click **"Save"**

#### Option B: If Vercel gives you A Records

1. **For www:**
   - **Type:** `A`
   - **Name:** `www`
   - **Value:** IP address from Vercel
   - **TTL:** `1 Hour`
   - Click **"Save"**

2. **For root (@):**
   - **Type:** `A`
   - **Name:** `@`
   - **Value:** IP address from Vercel
   - **TTL:** `1 Hour`
   - Click **"Save"**

### Step 3: Update Existing Records

**IMPORTANT:** You need to update or delete the existing "WebsiteBuilder Site" record:

1. **Find the A record with "WebsiteBuilder Site"**
2. **Click the "Edit" icon** (pencil) on that record
3. **Change the Value to:** The IP address Vercel provides
4. **OR delete it** and create a new one as shown above

### Step 4: Final DNS Records Should Look Like:

After setup, you should have:

```
Type    Name    Data                          TTL
A       @       [Vercel IP Address]           1 Hour
CNAME   www     cname.vercel-dns.com          1 Hour
NS      @       ns75.domaincontrol.com.       1 Hour
NS      @       ns76.domaincontrol.com.       1 Hour
```

**Note:** Keep the NS (nameserver) records as they are - don't change those!

### Step 5: Wait for DNS Propagation

- DNS changes can take **5-30 minutes** to propagate
- Sometimes up to 24 hours (but usually much faster)
- You can check status in Vercel dashboard

### Step 6: Verify in Vercel

1. Go back to Vercel → Settings → Domains
2. You should see `www.shotonme.com` with a status
3. It will show "Valid Configuration" when DNS is correct
4. Vercel will automatically issue an SSL certificate (HTTPS)

---

## 🎯 Quick Checklist

- [ ] Added domain `www.shotonme.com` in Vercel
- [ ] Got DNS instructions from Vercel
- [ ] Added CNAME record for `www` in GoDaddy
- [ ] Added A record for `@` (root) in GoDaddy
- [ ] Updated/deleted old "WebsiteBuilder Site" record
- [ ] Saved all changes in GoDaddy
- [ ] Waited 5-30 minutes for DNS propagation
- [ ] Verified in Vercel dashboard

---

## 🆘 Troubleshooting

### "Invalid Configuration" in Vercel?
- Double-check the DNS records match exactly what Vercel shows
- Make sure you saved the changes in GoDaddy
- Wait a bit longer for DNS to propagate

### Domain not loading?
- Check if DNS has propagated: https://dnschecker.org
- Verify records are correct in GoDaddy
- Make sure Vercel shows "Valid Configuration"

### Still showing old website?
- Clear your browser cache
- Try in incognito/private mode
- Wait longer for DNS propagation

---

## 📝 Notes

- **Don't change the NS records** - those are for GoDaddy's nameservers
- **TTL of 1 Hour is fine** - you can lower it later if needed
- **Vercel handles HTTPS automatically** - no need to configure SSL
- **Both www.shotonme.com and shotonme.com** will work after setup

---

**Once DNS propagates, your app will be live at www.shotonme.com! 🎉**

