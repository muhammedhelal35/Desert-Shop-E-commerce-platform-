const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middlewares/auth');
const { validateRegister, validateLogin } = require('../validators/auth');
const { rateLimit } = require('express-rate-limit');
const passport = require('passport');
const { validationResult } = require('express-validator');

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: 'Too many attempts, please try again later'
});

// GET routes for auth pages
router.get('/login', (req, res) => {
  res.render('auth/login', {
    title: 'Login',
    success_msg: req.flash('success_msg'),
    error_msg: req.flash('error_msg')
  });
});

router.get('/register', (req, res) => {
  res.render('auth/register', {
    title: 'Register',
    success_msg: req.flash('success_msg'),
    error_msg: req.flash('error_msg')
  });
});

// Register new user
router.post('/register', authLimiter, validateRegister, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().reduce((acc, error) => {
      acc[error.param] = error.msg;
      return acc;
    }, {});
    
    return res.status(400).render('auth/register', {
      title: 'Register',
      formData: req.body,
      fieldErrors: errorMessages
    });
  }

  try {
    const { name, email, password, phone } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).render('auth/register', {
        title: 'Register',
        formData: req.body,
        fieldErrors: { email: 'Email already registered' }
      });
    }

    const user = new User({ name, email, password, phone });
    await user.save();

    const token = jwt.sign(
      { _id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    req.session.token = token;
    req.session.user = user;

    // TODO: Implement email verification
    // Send verification email
    // const verificationToken = jwt.sign(
    //   { _id: user._id.toString() },
    //   process.env.JWT_SECRET + user.password,
    //   { expiresIn: '1d' }
    // );
    // await sendVerificationEmail(user.email, user.name, verificationToken);

    req.flash('success_msg', 'Registration successful! Welcome to Sweet Delights!');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).render('auth/register', {
      title: 'Register',
      formData: req.body,
      error_msg: 'Registration failed. Please try again.'
    });
  }
});

// Login user
router.post('/login', authLimiter, validateLogin, async (req, res) => {
  try {
    const { email, password, remember } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).render('auth/login', {
        title: 'Login',
        error_msg: 'Invalid email or password',
        formData: { email }
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).render('auth/login', {
        title: 'Login',
        error_msg: 'Invalid email or password',
        formData: { email }
      });
    }

    // Generate token with longer expiry if "remember me" is checked
    const expiresIn = remember ? '30d' : '7d';
    const token = jwt.sign(
      { _id: user._id.toString() },
      process.env.JWT_SECRET,
      { expiresIn }
    );

    // Store token in session
    req.session.token = token;
    req.session.user = user;

    // Set secure cookie if in production
    if (process.env.NODE_ENV === 'production') {
      res.cookie('token', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: expiresIn === '30d' ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
      });
    }

    req.flash('success_msg', `Welcome back, ${user.name}!`);
    
    // Redirect based on user role
    if (user.role === 'admin') {
      // Admin users go to admin dashboard
      res.redirect('/admin/dashboard');
    } else {
      // Regular users go to intended URL or home page
      const redirectTo = req.session.returnTo || '/';
      delete req.session.returnTo;
      res.redirect(redirectTo);
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).render('auth/login', {
      title: 'Login',
      error_msg: 'Login failed. Please try again.',
      formData: { email: req.body.email }
    });
  }
});

// Social auth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { failureRedirect: '/auth/login', failureFlash: true }),
  (req, res) => {
    req.flash('success_msg', 'Logged in with Google successfully!');
    res.redirect('/');
  }
);

router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/auth/login', failureFlash: true }),
  (req, res) => {
    req.flash('success_msg', 'Logged in with Facebook successfully!');
    res.redirect('/');
  }
);

// Logout user
router.get('/logout', auth, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    res.clearCookie('token');
    res.redirect('/');
  });
});

// Logout user (POST method for form submissions)
router.post('/logout', auth, (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    res.clearCookie('token');
    res.redirect('/');
  });
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('orderHistory')
      .populate('wishlist');
      
    res.render('auth/profile', { 
      title: 'My Profile',
      user,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (error) {
    console.error('Profile error:', error);
    req.flash('error_msg', 'Error fetching profile');
    res.redirect('/');
  }
});

// Update user profile
router.post('/profile', auth, async (req, res) => {
  try {
    const updates = Object.keys(req.body);
    const allowedUpdates = ['name', 'email', 'phone', 'address', 'preferences'];
    const isValidOperation = updates.every(update => allowedUpdates.includes(update));

    if (!isValidOperation) {
      return res.status(400).render('auth/profile', {
        title: 'My Profile',
        user: req.user,
        error_msg: 'Invalid updates!'
      });
    }

    // Check if email is being changed to one that already exists
    if (req.body.email && req.body.email !== req.user.email) {
      const existingUser = await User.findOne({ email: req.body.email });
      if (existingUser) {
        return res.status(400).render('auth/profile', {
          title: 'My Profile',
          user: req.user,
          error_msg: 'Email already in use by another account'
        });
      }
    }

    updates.forEach(update => req.user[update] = req.body[update]);
    await req.user.save();

    // Update session user data
    req.session.user = req.user;

    req.flash('success_msg', 'Profile updated successfully!');
    res.redirect('/auth/profile');
  } catch (error) {
    console.error('Profile update error:', error);
    req.flash('error_msg', 'Error updating profile');
    res.redirect('/auth/profile');
  }
});

// Update user settings (AJAX endpoint)
router.post('/settings', auth, async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      preferences,
      showEmail,
      showPhone,
      showAddress,
      emailNotifications,
      theme,
      language,
      avatar
    } = req.body;

    // Validate required fields
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Name and email are required'
      });
    }

    // Check if email is being changed to one that already exists
    if (email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another account'
        });
      }
    }

    // Update user fields
    const updateFields = {
      name,
      email,
      phone: phone || '',
      address: address || '',
      preferences: preferences || '',
      showEmail: showEmail || false,
      showPhone: showPhone || false,
      showAddress: showAddress || false,
      emailNotifications: emailNotifications || false,
      theme: theme || 'light',
      language: language || 'en',
      avatar: avatar || null
    };

    // Update user in database
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update session user data
    req.session.user = updatedUser;

    res.json({
      success: true,
      message: 'Settings updated successfully',
      user: {
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        address: updatedUser.address,
        preferences: updatedUser.preferences,
        showEmail: updatedUser.showEmail,
        showPhone: updatedUser.showPhone,
        showAddress: updatedUser.showAddress,
        emailNotifications: updatedUser.emailNotifications,
        theme: updatedUser.theme,
        language: updatedUser.language,
        avatar: updatedUser.avatar
      }
    });

  } catch (error) {
    console.error('Settings update error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again.'
    });
  }
});

// Upload avatar
router.post('/avatar', auth, async (req, res) => {
  try {
    const { avatarData } = req.body;
    
    if (!avatarData) {
      return res.status(400).json({
        success: false,
        message: 'Avatar data is required'
      });
    }

    // Update user avatar in database
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: avatarData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update session user data
    req.session.user = updatedUser;

    res.json({
      success: true,
      message: 'Avatar updated successfully',
      avatar: updatedUser.avatar
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again.'
    });
  }
});

// Forgot password route
router.get('/forgot', (req, res) => {
  res.render('auth/forgot', { 
    title: 'Forgot Password',
    error_msg: req.flash('error_msg'),
    success_msg: req.flash('success_msg')
  });
});

router.post('/forgot', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).render('auth/forgot', {
        title: 'Forgot Password',
        error_msg: 'No account with that email exists',
        formData: { email }
      });
    }

    // Generate reset token
    const resetToken = jwt.sign(
      { _id: user._id.toString() },
      process.env.JWT_SECRET + user.password,
      { expiresIn: '1h' }
    );

    // Save token to user
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // TODO: Implement password reset email
    // Send email with reset link (in production)
    // if (process.env.NODE_ENV === 'production') {
    //   await sendPasswordResetEmail(user.email, resetToken);
    // }

    req.flash('success_msg', 'Password reset link sent to your email');
    res.redirect('/auth/forgot');
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).render('auth/forgot', {
      title: 'Forgot Password',
      error_msg: 'Error processing your request',
      formData: req.body
    });
  }
});

// Reset password routes
router.get('/reset/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);
    
    if (!user || !user.resetPasswordToken || user.resetPasswordToken !== token) {
      return res.render('auth/reset', {
        title: 'Reset Password',
        token: null,
        error_msg: 'Invalid or expired reset token'
      });
    }
    
    // Check if token is expired
    if (user.resetPasswordExpires < Date.now()) {
      return res.render('auth/reset', {
        title: 'Reset Password',
        token: null,
        error_msg: 'Reset token has expired'
      });
    }
    
    res.render('auth/reset', {
      title: 'Reset Password',
      token: token,
      success_msg: req.flash('success_msg'),
      error_msg: req.flash('error_msg')
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.render('auth/reset', {
      title: 'Reset Password',
      token: null,
      error_msg: 'Invalid reset token'
    });
  }
});

router.post('/reset/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;
    
    // Validate passwords match
    if (password !== confirmPassword) {
      return res.status(400).render('auth/reset', {
        title: 'Reset Password',
        token: token,
        error_msg: 'Passwords do not match'
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);
    
    if (!user || !user.resetPasswordToken || user.resetPasswordToken !== token) {
      return res.render('auth/reset', {
        title: 'Reset Password',
        token: null,
        error_msg: 'Invalid or expired reset token'
      });
    }
    
    // Check if token is expired
    if (user.resetPasswordExpires < Date.now()) {
      return res.render('auth/reset', {
        title: 'Reset Password',
        token: null,
        error_msg: 'Reset token has expired'
      });
    }
    
    // Update password
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    
    req.flash('success_msg', 'Password has been reset successfully. You can now login with your new password.');
    res.redirect('/auth/login');
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).render('auth/reset', {
      title: 'Reset Password',
      token: token,
      error_msg: 'Error resetting password. Please try again.'
    });
  }
});

module.exports = router;