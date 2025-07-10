const express = require('express');
const router = express.Router();

// Test functionality page
router.get('/', (req, res) => {
  res.render('test-functionality', {
    title: 'Functionality Test',
    user: req.user || null
  });
});

module.exports = router; 