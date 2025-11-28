# ⚡ Quick DNS Setup (5 Minutes)

## What You Need from Vercel

1. Go to **Vercel → Settings → Domains**
2. Add domain: `www.shotonme.com`
3. **Copy these values:**
   - IP address for `@` (root domain)
   - CNAME value for `www`

## What to Do in GoDaddy

### 1. Edit the A Record (Root Domain)

- Find: A record with "WebsiteBuilder Site"
- Click: Edit (pencil icon)
- Change: Data/Value → Put the IP from Vercel
- Save

### 2. Add CNAME Record (www)

- Click: "Add New Record"
- Type: `CNAME`
- Name: `www`
- Data: CNAME value from Vercel
- TTL: `1 Hour`
- Save

### 3. Wait 10-30 Minutes

- Check status in Vercel
- Visit `https://www.shotonme.com`

**Done!** 🎉

