# ⚡ Quick Configuration Guide

This is the fastest way to get everything configured!

## Option 1: Use the Script (Easiest!)

Run this script and it will ask you for the info:

```powershell
.\update-env.ps1
```

It will:
- ✅ Create `backend/.env` if it doesn't exist
- ✅ Ask for MongoDB connection string
- ✅ Ask for Twilio credentials
- ✅ Update everything automatically

## Option 2: Manual Setup

### Step 1: Get MongoDB Connection String

Follow `MONGODB_ATLAS_SETUP.md` - it takes 10 minutes!

You'll get a string like:
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/shotonme?retryWrites=true&w=majority
```

### Step 2: Find Your Twilio Info

See `FIND_TWILIO_INFO.md` for where to look in VS Code.

You need:
- Account SID (starts with `AC`)
- Auth Token
- Phone Number (format: `+1234567890`)

### Step 3: Update backend/.env

Open `backend/.env` and replace:

```env
# Replace this:
MONGODB_URI=mongodb://localhost:27017/shotonme

# With your MongoDB Atlas string:
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/shotonme?retryWrites=true&w=majority
```

And replace:

```env
# Replace these:
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# With your actual values:
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_actual_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

## ✅ Quick Checklist

- [ ] MongoDB Atlas cluster created
- [ ] Database user created (saved username/password)
- [ ] Network access configured
- [ ] MongoDB connection string copied
- [ ] Twilio credentials found
- [ ] `backend/.env` file updated
- [ ] Tested connection (start backend, see "✅ Connected to MongoDB")

## 🚀 Next Step

After configuration:
```powershell
cd backend
npm run dev
```

Look for: `✅ Connected to MongoDB`

If you see that, you're good to go! 🎉

## 🆘 Need Help?

- **MongoDB:** See `MONGODB_ATLAS_SETUP.md`
- **Twilio:** See `FIND_TWILIO_INFO.md`
- **Troubleshooting:** See `TROUBLESHOOTING.md`

