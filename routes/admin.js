const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const { adminAuth } = require('../middlewares/auth');
const { validationResult } = require('express-validator');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/images/products/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Admin dashboard with enhanced statistics
router.get('/dashboard', adminAuth, async (req, res) => {
  try {
    // Get total sales
    const totalSales = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);

    // Get total orders
    const totalOrders = await Order.countDocuments();

    // Get total customers
    const totalCustomers = await User.countDocuments({ role: 'user' });

    // Get total products
    const totalProducts = await Product.countDocuments();

    // Get monthly sales
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const monthlySales = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: 'completed',
          createdAt: { $gte: currentMonth }
        } 
      },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);

    // Get top selling products
    const topProducts = await Product.find()
      .sort({ salesCount: -1 })
      .limit(5);

    // Get recent orders
    const recentOrders = await Order.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get sales by category
    const salesByCategory = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          count: { $sum: '$items.quantity' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Get daily sales for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dailySales = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: 'completed',
          createdAt: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$finalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get recent products
    const recentProducts = await Product.find().sort({ createdAt: -1 }).limit(5);

    // Compose stats array for dashboard cards
    const stats = [
      {
        icon: 'fas fa-dollar-sign',
        title: 'Total Sales',
        value: `$${(totalSales[0]?.total || 0).toLocaleString()}`
      },
      {
        icon: 'fas fa-shopping-cart',
        title: 'Total Orders',
        value: totalOrders.toLocaleString()
      },
      {
        icon: 'fas fa-users',
        title: 'Total Customers',
        value: totalCustomers.toLocaleString()
      },
      {
        icon: 'fas fa-boxes',
        title: 'Total Products',
        value: totalProducts.toLocaleString()
      }
    ];
    res.render('admin/dashboard', {
      title: 'Admin Dashboard',
      active: 'admin-dashboard',
      adminName: req.user && req.user.name ? req.user.name : 'Admin',
      stats,
      totalSales: totalSales[0]?.total || 0,
      totalOrders,
      totalCustomers,
      totalProducts,
      monthlySales: monthlySales[0]?.total || 0,
      topProducts,
      recentProducts,
      recentOrders,
      salesByCategory,
      dailySales
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    req.flash('error_msg', 'Error loading dashboard');
    res.redirect('/');
  }
});

// Product management - List all products
router.get('/products', adminAuth, async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.render('admin/products/index', { 
      title: 'Product Management',
      active: 'admin-products',
      products,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (error) {
    req.flash('error_msg', 'Error fetching products');
    res.redirect('/admin/dashboard');
  }
});

// Create product form
router.get('/products/new', adminAuth, (req, res) => {
  res.render('admin/products/new', { 
    title: 'Add New Product',
    active: 'admin-products',
    product: {},
    success_msg: req.flash('success_msg'),
    error_msg: req.flash('error_msg')
  });
});

// Create product
router.post('/products', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock, isActive } = req.body;
    
    // Validation
    if (!name || !description || !price || !category || stock === undefined) {
      req.flash('error_msg', 'All required fields must be filled');
      return res.redirect('/admin/products/new');
    }

    if (parseFloat(price) <= 0) {
      req.flash('error_msg', 'Price must be greater than 0');
      return res.redirect('/admin/products/new');
    }

    if (parseInt(stock) < 0) {
      req.flash('error_msg', 'Stock cannot be negative');
      return res.redirect('/admin/products/new');
    }

    // Validate category
    const validCategories = ['Cakes', 'Cookies', 'Ice Cream', 'Pastries', 'Pies', 'Breads', 'Desserts', 'Beverages', 'Other'];
    if (!validCategories.includes(category)) {
      req.flash('error_msg', 'Invalid category selected');
      return res.redirect('/admin/products/new');
    }
    
    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      isActive: isActive === 'on'
    };

    if (req.file) {
      productData.image = `/images/products/${req.file.filename}`;
    } else {
      // Set a default image if none provided
      productData.image = '/images/product/default-product.jpg';
    }

    const product = new Product(productData);
    await product.save();

    req.flash('success_msg', 'Product created successfully');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Create product error:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      req.flash('error_msg', `Validation error: ${errorMessages.join(', ')}`);
    } else {
      req.flash('error_msg', 'Error creating product. Please try again.');
    }
    
    res.redirect('/admin/products/new');
  }
});

// Edit product form
router.get('/products/:id/edit', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/admin/products');
    }
    res.render('admin/products/edit', { 
      title: 'Edit Product',
      active: 'admin-products',
      product,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (error) {
    req.flash('error_msg', 'Error fetching product');
    res.redirect('/admin/products');
  }
});

// Update product
router.post('/products/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const { name, description, price, category, stock, isActive } = req.body;
    
    // Validation
    if (!name || !description || !price || !category || stock === undefined) {
      req.flash('error_msg', 'All required fields must be filled');
      return res.redirect(`/admin/products/${req.params.id}/edit`);
    }

    if (parseFloat(price) <= 0) {
      req.flash('error_msg', 'Price must be greater than 0');
      return res.redirect(`/admin/products/${req.params.id}/edit`);
    }

    if (parseInt(stock) < 0) {
      req.flash('error_msg', 'Stock cannot be negative');
      return res.redirect(`/admin/products/${req.params.id}/edit`);
    }

    // Validate category
    const validCategories = ['Cakes', 'Cookies', 'Ice Cream', 'Pastries', 'Pies', 'Breads', 'Desserts', 'Beverages', 'Other'];
    if (!validCategories.includes(category)) {
      req.flash('error_msg', 'Invalid category selected');
      return res.redirect(`/admin/products/${req.params.id}/edit`);
    }
    
    const productData = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price),
      category,
      stock: parseInt(stock),
      isActive: isActive === 'on'
    };

    if (req.file) {
      productData.image = `/images/products/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      productData,
      { new: true, runValidators: true }
    );

    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/admin/products');
    }

    req.flash('success_msg', 'Product updated successfully');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Update product error:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      req.flash('error_msg', `Validation error: ${errorMessages.join(', ')}`);
    } else {
      req.flash('error_msg', 'Error updating product. Please try again.');
    }
    
    res.redirect(`/admin/products/${req.params.id}/edit`);
  }
});

// Delete product
router.delete('/products/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/admin/products');
    }

    // Delete the product image file if it exists and is not a default image
    if (product.image && !product.image.includes('default-product.jpg')) {
      const imagePath = path.join(__dirname, '..', 'public', product.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await Product.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Product deleted successfully');
    res.redirect('/admin/products');
  } catch (error) {
    console.error('Delete product error:', error);
    req.flash('error_msg', 'Error deleting product');
    res.redirect('/admin/products');
  }
});

// Order management - List all orders with search and filters
router.get('/orders', adminAuth, async (req, res) => {
  try {
    const { orderId, customer, status, dateFilter } = req.query;
    
    // Build query object
    let query = {};
    
    // Search by order ID
    if (orderId) {
      query._id = { $regex: orderId, $options: 'i' };
    }
    
    // Search by customer name or email
    if (customer) {
      query.$or = [
        { customerName: { $regex: customer, $options: 'i' } },
        { customerEmail: { $regex: customer, $options: 'i' } }
      ];
    }
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by date
    if (dateFilter) {
      const now = new Date();
      let startDate;
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }
    
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name price image')
      .sort({ createdAt: -1 });
    
    res.render('admin/orders/index', { 
      title: 'Order Management',
      active: 'admin-orders',
      orders,
      query: req.query, // Pass query params back to view
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (error) {
    console.error('Admin orders error:', error);
    req.flash('error_msg', 'Error fetching orders');
    res.redirect('/admin/dashboard');
  }
});

// View order details
router.get('/orders/:id', adminAuth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone address')
      .populate('items.product', 'name price image description');
    
    if (!order) {
      req.flash('error_msg', 'Order not found');
      return res.redirect('/admin/orders');
    }

    res.render('admin/orders/show', { 
      title: 'Order Details',
      active: 'admin-orders',
      order,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (error) {
    console.error('Admin order details error:', error);
    req.flash('error_msg', 'Error fetching order');
    res.redirect('/admin/orders');
  }
});

// Update order status
router.post('/orders/:id/status', adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      req.flash('error_msg', 'Invalid status');
      return res.redirect(`/admin/orders/${req.params.id}`);
    }
    
    const order = await Order.findById(req.params.id);

    if (!order) {
      req.flash('error_msg', 'Order not found');
      return res.redirect('/admin/orders');
    }

    const oldStatus = order.status;
    
    // Update only the status and updatedAt fields to avoid validation issues
    const updateData = {
      status: status,
      updatedAt: new Date()
    };
    
    // Use findByIdAndUpdate to avoid triggering full validation
    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { 
        new: true, 
        runValidators: false, // Skip validation for status updates
        context: 'query'
      }
    );

    if (!updatedOrder) {
      req.flash('error_msg', 'Failed to update order status');
      return res.redirect(`/admin/orders/${req.params.id}`);
    }

    // Log the status change
    console.log(`Order ${order._id} status changed from ${oldStatus} to ${status} by admin ${req.user.email}`);

    req.flash('success_msg', `Order status updated from ${oldStatus} to ${status}`);
    res.redirect(`/admin/orders/${req.params.id}`);
  } catch (error) {
    console.error('Admin order status update error:', error);
    req.flash('error_msg', 'Error updating order status');
    res.redirect(`/admin/orders/${req.params.id}`);
  }
});

// User management - List all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.render('admin/users/index', { 
      title: 'User Management',
      active: 'admin-users',
      users,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (error) {
    req.flash('error_msg', 'Error fetching users');
    res.redirect('/admin/dashboard');
  }
});

// Create admin account form
router.get('/users/new-admin', adminAuth, (req, res) => {
  res.render('admin/users/new-admin', { 
    title: 'Create Admin Account',
    active: 'admin-users',
    success_msg: req.flash('success_msg'),
    error_msg: req.flash('error_msg')
  });
});

// Create admin account
router.post('/users/new-admin', adminAuth, async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (password !== confirmPassword) {
      req.flash('error_msg', 'Passwords do not match');
      return res.redirect('/admin/users/new-admin');
    }

    if (password.length < 6) {
      req.flash('error_msg', 'Password must be at least 6 characters long');
      return res.redirect('/admin/users/new-admin');
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      req.flash('error_msg', 'User with this email already exists');
      return res.redirect('/admin/users/new-admin');
    }

    // Create admin user
    const adminUser = new User({
      name,
      email,
      password,
      role: 'admin'
    });

    await adminUser.save();

    req.flash('success_msg', 'Admin account created successfully');
    res.redirect('/admin/users');
  } catch (error) {
    console.error('Create admin error:', error);
    req.flash('error_msg', 'Error creating admin account');
    res.redirect('/admin/users/new-admin');
  }
});

// Enhanced Analytics
router.get('/analytics', adminAuth, async (req, res) => {
  try {
    // Sales by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const salesByDate = await Order.aggregate([
      { 
        $match: { 
          paymentStatus: 'completed',
          createdAt: { $gte: thirtyDaysAgo }
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          total: { $sum: '$finalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top customers
    const topCustomers = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      {
        $group: {
          _id: '$user',
          total: { $sum: '$finalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' }
    ]);

    // Most sold products
    const mostSoldProducts = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product._id',
          name: { $first: '$product.name' },
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: 10 }
    ]);

    // Sales by category
    const salesByCategory = await Order.aggregate([
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $group: {
          _id: '$product.category',
          total: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          count: { $sum: '$items.quantity' }
        }
      },
      { $sort: { total: -1 } }
    ]);

    // Payment statistics
    const paymentStats = await Order.aggregate([
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          total: { $sum: '$finalAmount' }
        }
      }
    ]);

    res.render('admin/analytics', {
      title: 'Analytics & Reports',
      active: 'admin-analytics',
      salesByDate,
      topCustomers,
      mostSoldProducts,
      salesByCategory,
      paymentStats
    });
  } catch (error) {
    console.error('Analytics error:', error);
    req.flash('error_msg', 'Error loading analytics');
    res.redirect('/admin/dashboard');
  }
});

// Bulk order operations
router.post('/orders/bulk-action', adminAuth, async (req, res) => {
  try {
    const { action, orderIds, status } = req.body;
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No orders selected' });
    }
    
    let updateCount = 0;
    
    switch (action) {
      case 'update-status':
        if (!status) {
          return res.status(400).json({ success: false, message: 'Status is required' });
        }
        
        const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
        if (!validStatuses.includes(status)) {
          return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        
        const result = await Order.updateMany(
          { _id: { $in: orderIds } },
          { 
            $set: { 
              status: status,
              updatedAt: new Date()
            }
          },
          { runValidators: false } // Skip validation for bulk updates
        );
        
        updateCount = result.modifiedCount;
        break;
        
      case 'delete':
        const deleteResult = await Order.deleteMany({ _id: { $in: orderIds } });
        updateCount = deleteResult.deletedCount;
        break;
        
      default:
        return res.status(400).json({ success: false, message: 'Invalid action' });
    }
    
    res.json({ 
      success: true, 
      message: `${action === 'update-status' ? 'Updated' : 'Deleted'} ${updateCount} orders successfully`,
      updateCount 
    });
  } catch (error) {
    console.error('Bulk order action error:', error);
    res.status(500).json({ success: false, message: 'Error performing bulk action' });
  }
});

// Fix existing orders (migration endpoint)
router.post('/orders/fix-existing', adminAuth, async (req, res) => {
  try {
    // Find orders without customer info
    const ordersToFix = await Order.find({
      $or: [
        { customerName: { $exists: false } },
        { customerEmail: { $exists: false } },
        { customerName: '' },
        { customerEmail: '' }
      ]
    }).populate('user', 'name email phone');

    let fixedCount = 0;
    
    for (const order of ordersToFix) {
      if (order.user) {
        order.customerName = order.user.name || '';
        order.customerEmail = order.user.email || '';
        order.customerPhone = order.user.phone || '';
        await order.save();
        fixedCount++;
      }
    }

    res.json({ 
      success: true, 
      message: `Fixed ${fixedCount} orders with missing customer information`,
      fixedCount 
    });
  } catch (error) {
    console.error('Fix existing orders error:', error);
    res.status(500).json({ success: false, message: 'Error fixing existing orders' });
  }
});

// Get order statistics for dashboard
router.get('/orders/stats', adminAuth, async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          total: { $sum: '$finalAmount' }
        }
      }
    ]);
    
    const totalOrders = await Order.countDocuments();
    const totalRevenue = await Order.aggregate([
      { $match: { paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } }
    ]);
    
    res.json({
      success: true,
      stats,
      totalOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    console.error('Order stats error:', error);
    res.status(500).json({ success: false, message: 'Error fetching order statistics' });
  }
});

// Export orders to CSV
router.get('/orders/export', adminAuth, async (req, res) => {
  try {
    const { format = 'csv', status, dateFilter } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (dateFilter) {
      const now = new Date();
      let startDate;
      
      switch (dateFilter) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }
      
      if (startDate) {
        query.createdAt = { $gte: startDate };
      }
    }
    
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name price')
      .sort({ createdAt: -1 });
    
    if (format === 'csv') {
      const csvData = [
        ['Order ID', 'Customer', 'Email', 'Status', 'Total', 'Date', 'Payment Method', 'Payment Status']
      ];
      
      orders.forEach(order => {
        csvData.push([
          order._id.toString(),
          order.customerName || (order.user ? order.user.name : 'Guest'),
          order.customerEmail || (order.user ? order.user.email : '-'),
          order.status,
          order.finalAmount.toFixed(2),
          new Date(order.createdAt).toLocaleDateString(),
          order.paymentMethod,
          order.paymentStatus
        ]);
      });
      
      const csvContent = csvData.map(row => row.join(',')).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=orders.csv');
      res.send(csvContent);
    } else {
      res.json({ success: true, orders });
    }
  } catch (error) {
    console.error('Export orders error:', error);
    res.status(500).json({ success: false, message: 'Error exporting orders' });
  }
});

module.exports = router; 