const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { auth } = require('../middlewares/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

// Configure nodemailer
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Get all orders for user
router.get('/', auth, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('items.product')
      .sort({ createdAt: -1 });
    res.render('orders/index', { 
      orders,
      title: 'My Orders'
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    req.flash('error_msg', 'Error fetching orders');
    res.redirect('/');
  }
});

// Checkout page - MUST come before /:id route
router.get('/checkout', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      req.flash('error_msg', 'Cart is empty');
      return res.redirect('/cart');
    }

    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1; // 10% tax
    const shipping = 5.00; // Fixed shipping cost
    const total = subtotal + tax + shipping;

    res.render('orders/checkout', { 
      cart, 
      subtotal, 
      tax, 
      shipping, 
      total,
      title: 'Checkout'
    });
  } catch (error) {
    req.flash('error_msg', 'Error loading checkout');
    res.redirect('/cart');
  }
});

// Get single order - MUST come after /checkout route
router.get('/:id', auth, async (req, res) => {
  try {
    // Validate that the ID is a valid ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error_msg', 'Invalid order ID');
      return res.redirect('/orders');
    }

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('items.product');

    if (!order) {
      req.flash('error_msg', 'Order not found');
      return res.redirect('/orders');
    }

    res.render('orders/show', { 
      order,
      title: 'Order Details'
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    req.flash('error_msg', 'Error fetching order');
    res.redirect('/orders');
  }
});

// Process checkout
router.post('/checkout', auth, async (req, res) => {
  try {
    const { 
      paymentMethod, 
      shippingAddress, 
      name,
      email,
      phone,
      cardNumber, 
      cardholderName,
      expiryDate, 
      cvv,
      orderNotes,
      termsAccepted
    } = req.body;
    
    // Validate required fields
    if (!paymentMethod || !shippingAddress || !name || !email || !termsAccepted) {
      req.flash('error_msg', 'Please fill in all required fields and accept terms');
      return res.redirect('/orders/checkout');
    }
    
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      req.flash('error_msg', 'Cart is empty');
      return res.redirect('/cart');
    }

    // Check stock availability
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      if (!product) {
        req.flash('error_msg', `Product ${item.product.name} no longer exists`);
        return res.redirect('/cart');
      }
      if (product.stock < item.quantity) {
        req.flash('error_msg', `Not enough stock for ${product.name}. Available: ${product.stock}`);
        return res.redirect('/cart');
      }
    }

    // Calculate totals
    const subtotal = cart.items.reduce((total, item) => total + (item.price * item.quantity), 0);
    const tax = subtotal * 0.1;
    const shipping = 5.00;
    const total = subtotal + tax + shipping;

    // Create order
    const order = new Order({
      user: req.user._id,
      items: cart.items.map(item => ({
        product: item.product._id,
        quantity: item.quantity,
        price: item.price
      })),
      subtotal,
      tax,
      shipping,
      finalAmount: total,
      shippingAddress,
      customerName: name,
      customerEmail: email,
      customerPhone: phone,
      orderNotes: orderNotes || '',
      paymentMethod,
      status: 'pending',
      paymentStatus: 'pending'
    });

    // Process payment based on method
    if (paymentMethod === 'credit_card') {
      // Validate card details
      if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
        req.flash('error_msg', 'Please provide all card details');
        return res.redirect('/orders/checkout');
      }
      
      // Basic card validation
      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      if (cleanCardNumber.length < 13 || cleanCardNumber.length > 19) {
        req.flash('error_msg', 'Invalid card number');
        return res.redirect('/orders/checkout');
      }
      
      if (cvv.length < 3 || cvv.length > 4) {
        req.flash('error_msg', 'Invalid CVV');
        return res.redirect('/orders/checkout');
      }
      
      // Validate expiry date
      const [month, year] = expiryDate.split('/');
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      
      if (parseInt(year) < currentYear || (parseInt(year) === currentYear && parseInt(month) < currentMonth)) {
        req.flash('error_msg', 'Card has expired');
        return res.redirect('/orders/checkout');
      }
      
      // Simulate payment processing
      order.paymentStatus = 'completed';
      order.paymentDetails = {
        transactionId: 'TXN_' + Date.now(),
        paymentDate: new Date(),
        cardLast4: cleanCardNumber.slice(-4),
        cardholderName: cardholderName
      };
    } else if (paymentMethod === 'paypal') {
      // Simulate PayPal payment
      order.paymentStatus = 'completed';
      order.paymentDetails = {
        transactionId: 'PP_' + Date.now(),
        paymentDate: new Date(),
        method: 'PayPal'
      };
    } else if (paymentMethod === 'cash_on_delivery') {
      order.paymentStatus = 'pending';
      order.paymentDetails = {
        method: 'Cash on Delivery'
      };
    }

    await order.save();

    // Update product stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      product.stock -= item.quantity;
      product.salesCount += item.quantity;
      await product.save();
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Send order confirmation email (if email is configured)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: req.user.email,
          subject: 'Order Confirmation - Desert Shop',
          html: `
            <h1>Thank you for your order!</h1>
            <p>Order ID: ${order._id}</p>
            <p>Total Amount: $${order.finalAmount.toFixed(2)}</p>
            <p>Payment Method: ${order.paymentMethod.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
            <p>We'll notify you when your order ships.</p>
          `
        };
        await transporter.sendMail(mailOptions);
      } catch (emailError) {
        console.error('Email error:', emailError);
        // Don't fail the order if email fails
      }
    }

    req.flash('success_msg', 'Order placed successfully! Check your email for confirmation.');
    res.redirect(`/orders/${order._id}`);
  } catch (error) {
    console.error('Checkout error:', error);
    
    // Handle specific validation errors
    if (error.name === 'ValidationError') {
      const errorMessages = Object.values(error.errors).map(err => err.message);
      req.flash('error_msg', `Validation error: ${errorMessages.join(', ')}`);
    } else {
      req.flash('error_msg', 'Error processing checkout. Please try again.');
    }
    
    res.redirect('/cart');
  }
});

// Create payment intent for Stripe
router.post('/create-payment-intent', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(400).json({ error: 'Cart not found' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: cart.totalAmount * 100, // Convert to cents
      currency: 'usd',
      metadata: {
        userId: req.user._id.toString()
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret
    });
  } catch (error) {
    res.status(500).json({ error: 'Error creating payment intent' });
  }
});

// Cancel order
router.post('/:id/cancel', auth, async (req, res) => {
  try {
    // Validate that the ID is a valid ObjectId
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      req.flash('error_msg', 'Invalid order ID');
      return res.redirect('/orders');
    }

    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) {
      req.flash('error_msg', 'Order not found');
      return res.redirect('/orders');
    }

    if (order.status !== 'pending') {
      req.flash('error_msg', 'Cannot cancel order in current status');
      return res.redirect('/orders');
    }

    // Refund payment if credit card
    if (order.paymentMethod === 'credit_card' && order.paymentStatus === 'completed') {
      try {
        if (order.paymentDetails && order.paymentDetails.stripePaymentIntentId) {
          await stripe.refunds.create({
            payment_intent: order.paymentDetails.stripePaymentIntentId
          });
        }
        order.paymentStatus = 'refunded';
      } catch (refundError) {
        console.error('Refund error:', refundError);
        // Continue with cancellation even if refund fails
      }
    }

    // Restore product stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        product.salesCount = Math.max(0, product.salesCount - item.quantity);
        await product.save();
      }
    }

    order.status = 'cancelled';
    await order.save();

    req.flash('success_msg', 'Order cancelled successfully');
    res.redirect('/orders');
  } catch (error) {
    console.error('Cancel order error:', error);
    req.flash('error_msg', 'Error cancelling order');
    res.redirect('/orders');
  }
});

// Create Stripe Checkout session
router.get('/create-stripe-session', auth, async (req, res) => {
  try {
    // Find user's cart and calculate total
    const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
    if (!cart || cart.items.length === 0) {
      return res.redirect('/cart');
    }
    const line_items = cart.items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product.name,
        },
        unit_amount: Math.round(item.price * 100),
      },
      quantity: item.quantity,
    }));
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      success_url: `${req.protocol}://${req.get('host')}/orders/payment-success`,
      cancel_url: `${req.protocol}://${req.get('host')}/orders/payment-cancel`,
      customer_email: req.user.email,
    });
    res.redirect(session.url);
  } catch (err) {
    console.error('Stripe session error:', err);
    res.redirect('/orders/checkout');
  }
});

// Confirm cash order
router.get('/confirm-cash', auth, async (req, res) => {
  try {
    // Place order with payment method 'cash'
    // (Assume you have a function to create an order from cart)
    // You may need to implement createOrderFromCart
    await createOrderFromCart(req.user, 'cash');
    res.redirect('/orders/payment-success');
  } catch (err) {
    console.error('Cash order error:', err);
    res.redirect('/orders/checkout');
  }
});

// Helper to create order from cart
async function createOrderFromCart(user, paymentMethod) {
  const cart = await Cart.findOne({ user: user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) throw new Error('Cart is empty');
  const subtotal = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.1;
  const shipping = 5.00;
  const finalAmount = subtotal + tax + shipping;
  const shippingAddress = user.address && user.address.street ? `${user.address.street}, ${user.address.city}, ${user.address.state}, ${user.address.zipCode}` : 'N/A';
  const order = new Order({
    user: user._id,
    items: cart.items.map(item => ({
      product: item.product._id,
      quantity: item.quantity,
      price: item.price
    })),
    subtotal,
    tax,
    shipping,
    finalAmount,
    shippingAddress,
    paymentMethod: paymentMethod === 'cash' ? 'cash_on_delivery' : paymentMethod,
    paymentStatus: paymentMethod === 'cash' ? 'pending' : 'completed',
    status: 'pending'
  });
  await order.save();
  cart.items = [];
  await cart.save();
  return order;
}

module.exports = router; 