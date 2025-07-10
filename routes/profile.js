const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Order = require('../models/Order');
const { auth } = require('../middlewares/auth');

// Get user profile
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'orderHistory',
        populate: {
          path: 'items.product'
        }
      });

    // Get user's recent orders
    const recentOrders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 })
      .limit(5);

    // Get user's favorite categories
    const favoriteCategories = await Order.aggregate([
      { $match: { user: req.user._id } },
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
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 3 }
    ]);

    res.render('profile/index', {
      user,
      recentOrders,
      favoriteCategories
    });
  } catch (error) {
    req.flash('error_msg', 'Error fetching profile');
    res.redirect('/');
  }
});

// Update user profile
router.put('/', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'phone', 'address', 'preferences'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      req.flash('error_msg', 'Invalid updates');
      return res.redirect('/profile');
    }

    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();

    req.flash('success_msg', 'Profile updated successfully');
    res.redirect('/profile');
  } catch (error) {
    req.flash('error_msg', 'Error updating profile');
    res.redirect('/profile');
  }
});

// Get user's orders
router.get('/orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.render('profile/orders', { orders });
  } catch (error) {
    req.flash('error_msg', 'Error fetching orders');
    res.redirect('/profile');
  }
});

// Get user's order details
router.get('/orders/:id', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('items.product');

    if (!order) {
      req.flash('error_msg', 'Order not found');
      return res.redirect('/profile/orders');
    }

    res.render('profile/order-details', { order });
  } catch (error) {
    req.flash('error_msg', 'Error fetching order details');
    res.redirect('/profile/orders');
  }
});

// Update notification preferences
router.put('/notifications', auth, async (req, res) => {
  try {
    const { emailNotifications, smsNotifications } = req.body;
    req.user.preferences = {
      emailNotifications: emailNotifications === 'on',
      smsNotifications: smsNotifications === 'on'
    };
    await req.user.save();

    req.flash('success_msg', 'Notification preferences updated');
    res.redirect('/profile');
  } catch (error) {
    req.flash('error_msg', 'Error updating notification preferences');
    res.redirect('/profile');
  }
});

// Get user's favorite products
router.get('/favorites', auth, async (req, res) => {
  try {
    const favoriteProducts = await Order.aggregate([
      { $match: { user: req.user._id } },
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
          product: { $first: '$product' },
          totalPurchased: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalPurchased: -1 } }
    ]);

    res.render('profile/favorites', { favoriteProducts });
  } catch (error) {
    req.flash('error_msg', 'Error fetching favorite products');
    res.redirect('/profile');
  }
});

module.exports = router; 