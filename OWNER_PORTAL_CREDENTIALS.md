# 🔐 Owner Portal Login Credentials

## 📋 Current Setup

The **Owner Portal** (localhost:3000) requires special owner/admin privileges. There are **no default credentials** - you need to create an owner account.

---

## ✅ **Option 1: Use Test User (Recommended for Testing)**

Based on the test user setup script, you can use:

**Email:** `shotonme@yahoo.com`  
**Password:** `Password123!`

**⚠️ Note:** This user has `userType: 'venue'` which works for the **Venue Portal**, but the **Owner Portal** requires additional privileges.

---

## 🔧 **Option 2: Create Owner Account**

The Owner Portal checks for:
1. Email matching `OWNER_EMAIL` in `.env` (default: `owner@shotonme.com`)
2. User with `isOwner: true` field
3. User with `role: 'admin'` or `role: 'owner'`

### **To Create an Owner Account:**

1. **Set up the test users first:**
   ```powershell
   cd backend
   node scripts/setup-test-users.js
   ```

2. **Create an owner account manually:**
   - Register a new user via the API or directly in MongoDB
   - Set the email to match `OWNER_EMAIL` in your `.env` file
   - Or add `isOwner: true` or `role: 'admin'` to the user document

3. **Or update your `.env` file:**
   ```env
   OWNER_EMAIL=your-email@example.com
   ```
   Then use that email to login.

---

## 🚀 **Quick Setup: Create Owner User**

Run this command to create an owner account:

```powershell
cd backend
node -e "
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const email = 'owner@shotonme.com';
  const password = 'Owner123!';
  const hashedPassword = await bcrypt.hash(password, 12);
  
  let user = await User.findOne({ email });
  if (user) {
    user.password = hashedPassword;
    user.isOwner = true;
    user.role = 'owner';
    await user.save();
    console.log('✅ Updated owner account');
  } else {
    user = new User({
      email,
      password: hashedPassword,
      name: 'Owner Admin',
      firstName: 'Owner',
      lastName: 'Admin',
      isOwner: true,
      role: 'owner',
      userType: 'user',
      wallet: { balance: 0, pendingBalance: 0 }
    });
    await user.save();
    console.log('✅ Created owner account');
  }
  
  console.log('\n📋 Owner Portal Credentials:');
  console.log('   Email: owner@shotonme.com');
  console.log('   Password: Owner123!');
  console.log('\n');
  
  await mongoose.disconnect();
  process.exit(0);
})();
"
```

---

## 📝 **Summary**

**For Owner Portal (localhost:3000):**
- **Email:** `owner@shotonme.com` (after running setup above)
- **Password:** `Owner123!` (after running setup above)

**OR**

- **Email:** `shotonme@yahoo.com` (if you set `OWNER_EMAIL=shotonme@yahoo.com` in `.env`)
- **Password:** `Password123!`

---

**Note:** The owner portal is separate from the venue portal. Make sure you're accessing the correct URL:
- **Owner Portal:** `http://localhost:3000` (admin dashboard)
- **Venue Portal:** `http://localhost:3002` (venue owner dashboard)

