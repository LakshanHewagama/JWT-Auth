// admin.js (seed)
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');

dotenv.config({ debug: false });

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected');
  } catch (error) {
    console.error('Database connection error:', error.message);
    process.exit(1);
  }
};

// Disconnect from database
const disconnectDB = async () => {
  await mongoose.disconnect();
  console.log('MongoDB disconnected');
};

// Create admin user if not exists
const createAdmin = async () => {
  try {
    await connectDB();

    const email = 'admin@test.com';
    const existing = await User.findOne({ email });

    if (existing) {
      console.log(`Admin already exists: ${email}`);
      if (existing.role !== 'admin' || !existing.isActive) {
        existing.role = 'admin';
        existing.isActive = true;
        await existing.save({ validateBeforeSave: false });
        console.log('Updated existing user to admin role');
      }
      return existing;
    }

    const adminData = {
      firstName: 'Admin',
      lastName: 'User',
      email,
      password: 'admin123',
      role: 'admin',
      isActive: true
    };

    const admin = await User.create(adminData);
    console.log(`Admin created: ${email} / Password: admin123`);
    return admin;

  } catch (error) {
    console.error('Error creating admin:', error.message);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

// Run standalone
if (require.main === module) {
  createAdmin();
}

module.exports = createAdmin;
