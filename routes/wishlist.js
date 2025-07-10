const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Product = require('../models/Product');
const { auth } = require('../middlewares/auth');

// Render wishlist page
router.get('/page', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.render('wishlist', { 
      user,
      title: 'My Wishlist'
    });
  } catch (err) {
    console.error('Get wishlist page error:', err);
    req.flash('error_msg', 'Error loading wishlist');
    res.redirect('/');
  }
});

// Get wishlist
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    res.json({ success: true, wishlist: user.wishlist });
  } catch (err) {
    console.error('Get wishlist error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Add to wishlist
router.post('/add/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;
    
    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    // Check if already in wishlist
    if (user.wishlist.includes(productId)) {
      return res.status(400).json({ success: false, error: 'Product already in wishlist' });
    }
    
    user.wishlist.push(productId);
    await user.save();
    
    res.json({ success: true, message: 'Added to wishlist', wishlist: user.wishlist });
  } catch (err) {
    console.error('Wishlist add error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Remove from wishlist
router.post('/remove/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;
    
    // Check if product is in wishlist
    if (!user.wishlist.includes(productId)) {
      return res.status(404).json({ success: false, error: 'Product not found in wishlist' });
    }
    
    user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
    await user.save();
    
    res.json({ success: true, message: 'Removed from wishlist', wishlist: user.wishlist });
  } catch (err) {
    console.error('Wishlist remove error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Toggle wishlist (add if not present, remove if present)
router.post('/toggle/:productId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const productId = req.params.productId;
    
    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    
    const isInWishlist = user.wishlist.includes(productId);
    
    if (isInWishlist) {
      // Remove from wishlist
      user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
      await user.save();
      res.json({ 
        success: true, 
        message: 'Removed from wishlist', 
        inWishlist: false,
        wishlist: user.wishlist 
      });
    } else {
      // Add to wishlist
      user.wishlist.push(productId);
      await user.save();
      res.json({ 
        success: true, 
        message: 'Added to wishlist', 
        inWishlist: true,
        wishlist: user.wishlist 
      });
    }
  } catch (err) {
    console.error('Wishlist toggle error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// Clear wishlist
router.delete('/clear', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.wishlist = [];
    await user.save();
    
    res.json({ success: true, message: 'Wishlist cleared', wishlist: [] });
  } catch (err) {
    console.error('Clear wishlist error:', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router; 