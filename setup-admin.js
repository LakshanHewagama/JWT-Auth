const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');

const createAdminUser = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@test.com' });
    
    if (existingAdmin) {
      console.log('Admin user already exists:', existingAdmin.email);
      // Update to admin role if not already
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        console.log('Updated existing user to admin role');
      }
    } else {
      // Create new admin user
      const adminUser = await User.create({
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@test.com',
        password: 'admin123',
        role: 'admin'
      });

      console.log('Admin user created successfully:');
      console.log('Email:', adminUser.email);
      console.log('Password: admin123');
      console.log('Role:', adminUser.role);
    }

    // Create some sample regular users for testing
    const sampleUsers = [
      {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@test.com',
        password: 'user123',
        role: 'user'
      },
      {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@test.com',
        password: 'user123',
        role: 'user'
      },
      {
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob@test.com',
        password: 'user123',
        role: 'user',
        isActive: false
      }
    ];

    for (const userData of sampleUsers) {
      const existingUser = await User.findOne({ email: userData.email });
      if (!existingUser) {
        await User.create(userData);
        console.log(`Created sample user: ${userData.email}`);
      }
    }

    console.log('\n=== Admin Dashboard Setup Complete ===');
    console.log('Admin credentials:');
    console.log('Email: admin@test.com');
    console.log('Password: admin123');
    console.log('\nSample user credentials:');
    console.log('Email: john@test.com, Password: user123');
    console.log('Email: jane@test.com, Password: user123');
    console.log('Email: bob@test.com, Password: user123 (inactive)');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
};

createAdminUser();
