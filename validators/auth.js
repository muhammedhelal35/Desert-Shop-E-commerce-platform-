const { body, validationResult } = require('express-validator');

exports.validateRegister = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),
    
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must contain at least one uppercase, one lowercase, one number and one special character')
];

exports.validateLogin = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$#%^&*()])[A-Za-z\d@$#%^&*()]{8,}$/)
    .withMessage('Password must contain at least one uppercase, one lowercase, one number and one special character')
];

exports.validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Please enter a valid email')
    .normalizeEmail()
];

exports.validateResetPassword = [
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$#%^&*()])[A-Za-z\d@$#%^&*()]{8,}$/)
    .withMessage('Password must contain at least one uppercase, one lowercase, one number and one special character')
];

exports.validateChangePassword = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required')
    .isLength({ min: 8 }).withMessage('Current password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$#%^&*()])[A-Za-z\d@$#%^&*()]{8,}$/)
    .withMessage('Current password must contain at least one uppercase, one lowercase, one number and one special character'),

  body('newPassword')
    .notEmpty().withMessage('New password is required')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$#%^&*()])[A-Za-z\d@$#%^&*()]{8,}$/)
    .withMessage('New password must contain at least one uppercase, one lowercase, one number and one special character'),

  body('confirmPassword')
    .notEmpty().withMessage('Confirm password is required')
    .isLength({ min: 8 }).withMessage('Confirm password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$#%^&*()])[A-Za-z\d@$#%^&*()]{8,}$/)
    .withMessage('Confirm password must contain at least one uppercase, one lowercase, one number and one special character')
];