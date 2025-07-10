const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const connectDB = require('./config/db');
const expressLayouts = require('express-ejs-layouts');
const methodOverride = require('method-override');

const app = express();

require('dotenv').config();
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Method override for DELETE requests
app.use(methodOverride('_method'));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Express layouts setup
app.use(expressLayouts);
app.set('layout', 'layouts/main');
app.set('layout extractScripts', true);
app.set('layout extractStyles', true);

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Flash messages
app.use(flash());

// Global variables middleware
app.use((req, res, next) => {
  try {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  res.locals.user = req.session.user || null;
    res.locals.cartCount = req.session.cart ? req.session.cart.length : 0;
    res.locals.title = 'Sweet Delights'; // Default title
  next();
  } catch (error) {
    console.error('Global middleware error:', error);
    next(error);
  }
});

// Routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const cartRoutes = require('./routes/cart');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const wishlistRoutes = require('./routes/wishlist');
const testRoutes = require('./routes/test');

app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/cart', cartRoutes);
app.use('/orders', orderRoutes);
app.use('/admin', adminRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/test', testRoutes);

// Test route to debug rendering issues
app.get('/test', (req, res) => {
  try {
    res.render('test', { 
      title: 'Test Page',
      message: 'This is a test page'
    });
  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).send('Test route error: ' + error.message);
  }
});

// Home route
app.get('/', (req, res) => {
  try {
    res.render('home', { 
      title: 'Home',
      layout: 'layouts/main'
    });
  } catch (error) {
    console.error('Home route error:', error);
    res.status(500).render('error', {
      title: 'Error',
      errorCode: 500,
      errorMessage: 'Error loading home page',
      errorDescription: error.message,
      layout: false
    });
  }
});

// About route
app.get('/about', (req, res) => {
  try {
    res.render('about', {
      title: 'About Us',
      layout: 'layouts/main'
    });
  } catch (error) {
    console.error('About route error:', error);
    res.status(500).render('error', {
      title: 'Error',
      errorCode: 500,
      errorMessage: 'Error loading about page',
      errorDescription: error.message,
      layout: false
    });
  }
});

// Contact route
app.get('/contact', (req, res) => {
  try {
    res.render('contact', {
      title: 'Contact Us',
      layout: 'layouts/main'
    });
  } catch (error) {
    console.error('Contact route error:', error);
    res.status(500).render('error', {
      title: 'Error',
      errorCode: 500,
      errorMessage: 'Error loading contact page',
      errorDescription: error.message,
      layout: false
    });
  }
});

// Handle contact form submission
app.post('/contact', (req, res) => {
  // In a real application, you would process the form data here
  // For example, sending an email or storing in a database
  req.flash('success_msg', 'Thank you for your message! We will get back to you soon.');
  res.redirect('/contact');
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    errorCode: 404,
    errorMessage: 'Page Not Found',
    errorDescription: 'The page you are looking for does not exist.',
    layout: false
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).render('error', {
    title: 'Error',
    errorCode: err.status || 500,
    errorMessage: isDevelopment ? err.message : 'An unexpected error occurred.',
    errorDescription: isDevelopment ? err.stack : 'Sorry, something went wrong. Please try again later or go back to the home page.',
    layout: false
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
