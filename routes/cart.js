const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth } = require('../middlewares/auth');

// Get cart
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product');

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
      await cart.save();
    }

    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1; // 10% tax
    const shipping = 5.00; // Fixed shipping cost
    const total = subtotal + tax + shipping;

    res.render('cart/index', { 
      cart,
      subtotal,
      tax,
      shipping,
      total,
      title: 'Shopping Cart'
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    req.flash('error_msg', 'Error fetching cart');
    res.redirect('/');
  }
});

// Add item to cart
router.post('/add', auth, async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const product = await Product.findById(productId);

    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/products');
    }

    if (product.stock < quantity) {
      req.flash('error_msg', 'Not enough stock available');
      return res.redirect(`/products/${productId}`);
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = new Cart({ user: req.user._id, items: [] });
    }

    // Check if product already in cart
    const existingItem = cart.items.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += parseInt(quantity);
      existingItem.price = product.price;
    } else {
      cart.items.push({
        product: productId,
        quantity: parseInt(quantity),
        price: product.price
      });
    }

    await cart.save();
    req.flash('success_msg', 'Item added to cart');
    res.redirect('/cart');
  } catch (error) {
    req.flash('error_msg', 'Error adding item to cart');
    res.redirect('/products');
  }
});

// Update cart item quantity
router.put('/update/:itemId', auth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const item = cart.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found in cart' });
    }

    const product = await Product.findById(item.product);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (product.stock < quantity) {
      return res.status(400).json({ success: false, error: 'Not enough stock available' });
    }

    item.quantity = parseInt(quantity);
    await cart.save();

    res.json({ success: true, message: 'Cart updated successfully' });
  } catch (error) {
    console.error('Update cart error:', error);
    res.status(500).json({ success: false, error: 'Error updating cart' });
  }
});

// Remove item from cart
router.delete('/remove/:itemId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const itemIndex = cart.items.findIndex(
      item => item._id.toString() === req.params.itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ success: false, error: 'Item not found in cart' });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove item error:', error);
    res.status(500).json({ success: false, error: 'Error removing item from cart' });
  }
});

// Clear cart
router.delete('/clear', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    cart.items = [];
    await cart.save();

    res.json({ success: true, message: 'Cart cleared successfully' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ success: false, error: 'Error clearing cart' });
  }
});

// Remove item from cart by productId (for AJAX from product details)
router.post('/remove/:productId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }
    
    const initialLength = cart.items.length;
    cart.items = cart.items.filter(item => item.product.toString() !== req.params.productId);
    
    if (cart.items.length === initialLength) {
      return res.status(404).json({ success: false, error: 'Product not found in cart' });
    }
    
    await cart.save();
    res.json({ success: true, message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove product error:', error);
    res.status(500).json({ success: false, error: 'Error removing item from cart' });
  }
});

module.exports = router; 