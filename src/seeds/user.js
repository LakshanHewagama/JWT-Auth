// user.js (seed)
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

// Create regular user if not exists
const createUser = async () => {
  try {
    await connectDB();

    const email = 'user@test.com';
    const existing = await User.findOne({ email });

    if (existing) {
      console.log(`User already exists: ${email}`);
      if (existing.role !== 'user' || !existing.isActive) {
        existing.role = 'user';
        existing.isActive = true;
        await existing.save({ validateBeforeSave: false });
        console.log('Updated existing user');
      }
      return existing;
    }

    const userData = {
      firstName: 'John',
      lastName: 'Doe',
      email,
      password: 'user123',
      role: 'user',
      isActive: true
    };

    const user = await User.create(userData);
    console.log(`User created: ${email} / Password: user123`);
    return user;

  } catch (error) {
    console.error('Error creating user:', error.message);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
};

// Run standalone
if (require.main === module) {
  createUser();
}

module.exports = createUser;
