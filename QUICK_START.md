# ⚡ Quick Start Guide

Get up and running in 5 minutes!

## 1️⃣ Backend (API Server)

```bash
cd backend
npm install

# Create .env file
cat > .env << EOF
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/shotonme
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
PORT=5000
NODE_ENV=development
EOF

npm run dev
```

✅ Backend running on http://localhost:5000

## 2️⃣ Venue Portal

```bash
cd venue-portal
npm install

# Create .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:5000/api" > .env.local

npm run dev
```

✅ Portal running on http://localhost:3000

## 3️⃣ Mobile App

```bash
cd shot-on-me
npm install

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your-google-maps-key
EOF

npm run dev
```

✅ App running on http://localhost:3001

## 🎯 Test It Out

1. **Register a user** at http://localhost:3001
2. **Register a venue** at http://localhost:3000
3. **Create a promotion** in the venue portal
4. **Check in** at the venue in the mobile app
5. **See your rewards!** 🎉

## 🔧 Troubleshooting

**Backend won't start?**
- Check MongoDB connection string
- Verify port 5000 is available

**Frontend won't connect?**
- Make sure backend is running
- Check API URL in .env.local

**Need help?** See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**That's it! You're ready to go! 🚀**
