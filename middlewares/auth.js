const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    
    if (req.session.user) {
      req.user = req.session.user;
      return next();
    }

    
    const token = req.session.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      
      if (req.path === '/logout' || req.path === '/profile') {
        req.flash('error_msg', 'Please login to continue');
        return res.redirect('/auth/login');
      }
      
      
      req.flash('error_msg', 'Please login to access this resource');
      return res.redirect('/auth/login');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const user = await User.findOne({ _id: decoded._id });

    if (!user) {
      throw new Error('User not found');
    }

    req.token = token;
    req.user = user;
    req.session.user = user; 
    next();
  } catch (error) {
    
    if (error.message !== 'No token provided') {
      console.error('Auth middleware error:', error.message);
    }
    
    
    if (req.path === '/logout' || req.path === '/profile') {
      req.flash('error_msg', 'Please login to continue');
      return res.redirect('/auth/login');
    }
    
    req.flash('error_msg', 'Please login to access this resource');
    res.redirect('/auth/login');
  }
};

const adminAuth = async (req, res, next) => {
  try {
   
    if (!req.session.user) {
      req.flash('error_msg', 'Please login to access admin panel');
      return res.redirect('/auth/login');
    }

    
    if (req.session.user.role !== 'admin') {
      req.flash('error_msg', 'Access denied. Admin privileges required.');
      return res.redirect('/');
      }

    req.user = req.session.user;
      next();
  } catch (error) {
    console.error('Admin auth error:', error.message);
    req.flash('error_msg', 'Access denied. Admin privileges required.');
    res.redirect('/');
  }
};

module.exports = {
  auth,
  adminAuth
};