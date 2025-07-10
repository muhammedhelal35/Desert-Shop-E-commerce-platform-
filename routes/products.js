const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { auth, adminAuth } = require('../middlewares/auth');
const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/products');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1024 * 1024 * 5 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Not an image! Please upload an image.'), false);
    }
  }
});

// Get all products
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, page = 1 } = req.query;
    const limit = 9; // Number of products per page
    const currentPage = parseInt(page) || 1;
    let query = { isAvailable: true };

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Search by name or description
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort options
    let sortOption = {};
    if (sort === 'price_asc') {
      sortOption = { price: 1 };
    } else if (sort === 'price_desc') {
      sortOption = { price: -1 };
    } else if (sort === 'rating') {
      sortOption = { averageRating: -1 };
    } else {
      sortOption = { createdAt: -1 };
    }

    // Count total products for pagination
    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);
    const skip = (currentPage - 1) * limit;

    // Get products for current page
    const products = await Product.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limit);

    res.render('products/index', { 
      products,
      category: category || '',
      search: search || '',
      sort: sort || 'newest',
      currentPage,
      totalPages,
      totalProducts,
      title: 'Products'
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    req.flash('error_msg', 'Error fetching products');
    res.redirect('/');
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/products');
    }
    
    res.render('products/show', { 
      product,
      user: req.session.user || null,
      title: product.name
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    req.flash('error_msg', 'Error fetching product');
    res.redirect('/products');
  }
});

// Admin routes
// Create product
router.post('/', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const product = new Product({
      ...req.body,
      image: `/uploads/products/${req.file.filename}`
    });
    await product.save();
    req.flash('success_msg', 'Product created successfully');
    res.redirect('/admin/products');
  } catch (error) {
    req.flash('error_msg', 'Error creating product');
    res.redirect('/admin/products/new');
  }
});

// Update product
router.put('/:id', adminAuth, upload.single('image'), async (req, res) => {
  try {
    const updates = req.body;
    if (req.file) {
      updates.image = `/uploads/products/${req.file.filename}`;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/admin/products');
    }

    req.flash('success_msg', 'Product updated successfully');
    res.redirect('/admin/products');
  } catch (error) {
    req.flash('error_msg', 'Error updating product');
    res.redirect('/admin/products');
  }
});

// Delete product
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/admin/products');
    }
    req.flash('success_msg', 'Product deleted successfully');
    res.redirect('/admin/products');
  } catch (error) {
    req.flash('error_msg', 'Error deleting product');
    res.redirect('/admin/products');
  }
});

// Add product rating
router.post('/:id/rate', auth, async (req, res) => {
  try {
    const { rating, review } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      req.flash('error_msg', 'Product not found');
      return res.redirect('/products');
    }

    // Check if user has already rated
    const existingRating = product.ratings.find(
      r => r.user.toString() === req.user._id.toString()
    );

    if (existingRating) {
      existingRating.rating = rating;
      existingRating.review = review;
    } else {
      product.ratings.push({
        user: req.user._id,
        rating,
        review
      });
    }

    await product.save();
    req.flash('success_msg', 'Rating added successfully');
    res.redirect(`/products/${product._id}`);
  } catch (error) {
    req.flash('error_msg', 'Error adding rating');
    res.redirect('/products');
  }
});

module.exports = router;