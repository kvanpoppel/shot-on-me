require('dotenv').config();
const mongoose = require('mongoose');

async function fixPaymentIndex() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    const db = mongoose.connection.db;
    const collection = db.collection('payments');

    // Drop the existing redemptionCode index
    try {
      await collection.dropIndex('redemptionCode_1');
      console.log('✅ Dropped existing redemptionCode index\n');
    } catch (error) {
      if (error.codeName === 'IndexNotFound') {
        console.log('ℹ️  Index not found (may have been dropped already)\n');
      } else {
        console.log('⚠️  Error dropping index:', error.message);
        console.log('   Continuing anyway...\n');
      }
    }

    // Create a new sparse unique index
    // Sparse indexes skip null/undefined values, allowing multiple nulls
    await collection.createIndex(
      { redemptionCode: 1 },
      { 
        sparse: true, 
        unique: true,
        name: 'redemptionCode_1'
      }
    );
    console.log('✅ Created sparse unique index on redemptionCode\n');
    console.log('   This index will:');
    console.log('   • Only index non-null redemptionCode values');
    console.log('   • Allow multiple null values (for wallet_topup payments)');
    console.log('   • Enforce uniqueness only for non-null values\n');

    await mongoose.disconnect();
    console.log('✅ Done!');
    console.log('\n💡 Restart your backend server for changes to take effect.');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

fixPaymentIndex();

