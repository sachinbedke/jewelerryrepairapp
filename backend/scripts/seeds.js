const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');

// Load .env from parent directory
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

console.log('📁 Current directory:', __dirname);
console.log('📁 Looking for .env at:', path.join(__dirname, '..', '.env'));
console.log('🔑 MONGODB_URI:', process.env.MONGODB_URI || '❌ Not found');

// Import models
const User = require('../src/models/User');
const Branch = require('../src/models/Branch');
const Department = require('../src/models/Department');

const seedUsers = async () => {
  try {
    // Check if MONGODB_URI exists
    const mongoURI = process.env.MONGODB_URI;
    if (!mongoURI) {
      console.error('❌ MONGODB_URI not found in .env file');
      console.log('Please create a .env file in the backend root folder');
      process.exit(1);
    }

    console.log('📡 Connecting to MongoDB...');
    console.log(`Database: JewelryRepairApp`);
    
    await mongoose.connect(mongoURI);
    
    console.log('✅ Connected to MongoDB successfully');

    // Ensure branch and department documents exist for user references
    const branch = await Branch.findOneAndUpdate(
      { code: 'MB001' },
      { name: 'Main Branch', code: 'MB001' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const department = await Department.findOneAndUpdate(
      { code: 'DEPT001' },
      { name: 'Main Department', code: 'DEPT001' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    const users = [
      {
        employeeId: '1234567890',
        name: 'BRSH User',
        phone: '1234567890',
        password: '1234567890',
        role: 'BRSH',
        branchId: branch._id,
        departmentId: department._id,
        isActive: true,
        language: 'en'
      },
      {
        employeeId: '0987654321',
        name: 'RHO User',
        phone: '0987654321',
        password: '0987654321',
        role: 'RHO',
        branchId: branch._id,
        departmentId: department._id,
        isActive: true,
        language: 'en'
      },
      {
        employeeId: '1122334455',
        name: 'Karigar User',
        phone: '1122334455',
        password: '1122334455',
        role: 'KARIGAR',
        branchId: branch._id,
        departmentId: department._id,
        isActive: true,
        language: 'en'
      },
      
    ];

    let createdCount = 0;
    let updatedCount = 0;
    let existingCount = 0;

    for (const userData of users) {
      // Check if user already exists
      const existingUser = await User.findOne({ employeeId: userData.employeeId });
      
      if (!existingUser) {
        // Hash password
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        userData.password = hashedPassword;
        
        await User.create(userData);
        console.log(`✅ Created user: ${userData.name} (${userData.role}) - ID: ${userData.employeeId}`);
        createdCount++;
      } else {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        const needsPasswordUpdate = !await bcrypt.compare(userData.password, existingUser.password);
        const needsRefUpdate = existingUser.branchId?.toString() !== userData.branchId.toString() || existingUser.departmentId?.toString() !== userData.departmentId.toString();

        if (needsPasswordUpdate || needsRefUpdate) {
          await User.findByIdAndUpdate(existingUser._id, {
            password: hashedPassword,
            branchId: userData.branchId,
            departmentId: userData.departmentId,
          });
          console.log(`🔄 Updated existing user: ${userData.name} (${userData.role}) - ID: ${userData.employeeId}`);
          updatedCount++;
        } else {
          console.log(`⚠️ User already exists: ${userData.name} (${userData.role})`);
          existingCount++;
        }
      }
    }

    console.log(`\n🎉 Seed completed!`);
    console.log(`   Created: ${createdCount} new users`);
    console.log(`   Updated: ${updatedCount} users`);
    console.log(`   Existing untouched: ${existingCount} users`);
    console.log(`   Total in DB: ${await User.countDocuments()} users`);
    
    console.log('\n📋 Test Credentials (Employee ID / Password):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('BRSH:     1234567890 / 1234567890');
    console.log('RHO:      0987654321 / 0987654321');
    console.log('Karigar:  1122334455 / 1122334455');
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error.message);
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 Make sure MongoDB is running!');
      console.log('   Start MongoDB with: mongod');
      console.log('   Or install MongoDB from: https://www.mongodb.com/try/download/community');
    }
    process.exit(1);
  }
};

// Run seed
seedUsers();