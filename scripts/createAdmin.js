const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

// Connect to MongoDB using the same config as the main app
const connectDB = async () => {
    try {
        const connect = await mongoose.connect(process.env.MONGODBURI || 'mongodb://localhost:27017/desertshop', {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log(`MongoDB Connected: ${connect.connection.host}`);
        return true;
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        return false;
    }
};

const createAdminUser = async () => {
  try {
    // Connect to database
    const connected = await connectDB();
    if (!connected) {
      console.log('❌ Could not connect to database. Please check your MongoDB connection.');
      return;
    }

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@desertshop.com' });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists!');
      console.log('📧 Email: admin@desertshop.com');
      console.log('🔑 Password: Admin123!');
      console.log('🎯 Role: admin');
      return;
    }

    // Create admin user
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@desertshop.com',
      password: 'Admin123!',
      role: 'admin',
      phone: '+1234567890',
      address: {
        street: '123 Admin Street',
        city: 'Admin City',
        state: 'AS',
        zipCode: '12345'
      }
    });

    await adminUser.save();
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@desertshop.com');
    console.log('🔑 Password: Admin123!');
    console.log('🎯 Role: admin');
    console.log('\nYou can now login to the admin panel at: http://localhost:3000/auth/login');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    if (mongoose.connection.readyState === 1) {
      mongoose.connection.close();
    }
  }
};

createAdminUser(); 