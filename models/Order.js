const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    }
  }],
  subtotal: {
    type: Number,
    required: true
  },
  tax: {
    type: Number,
    required: true,
    default: 0
  },
  shipping: {
    type: Number,
    required: true,
    default: 0
  },
  finalAmount: {
    type: Number,
    required: true
  },
  shippingAddress: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: false,
    default: ''
  },
  customerEmail: {
    type: String,
    required: false,
    default: ''
  },
  customerPhone: {
    type: String,
    default: ''
  },
  orderNotes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'paypal', 'cash_on_delivery'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentDetails: {
    transactionId: String,
    paymentDate: Date,
    cardLast4: String,
    cardholderName: String,
    method: String
  },
  notes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt timestamp before saving
orderSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Ensure customer fields have default values if they're empty
  if (!this.customerName) {
    this.customerName = '';
  }
  if (!this.customerEmail) {
    this.customerEmail = '';
  }
  if (!this.customerPhone) {
    this.customerPhone = '';
  }
  
  next();
});

// Virtual for getting customer info from user if not set
orderSchema.virtual('customerInfo').get(function() {
  if (this.customerName && this.customerEmail) {
    return {
      name: this.customerName,
      email: this.customerEmail,
      phone: this.customerPhone
    };
  }
  return null;
});

// Method to populate customer info from user
orderSchema.methods.populateCustomerInfo = async function() {
  if (!this.customerName || !this.customerEmail) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.user);
      if (user) {
        this.customerName = user.name || '';
        this.customerEmail = user.email || '';
        this.customerPhone = user.phone || '';
        await this.save();
      }
    } catch (error) {
      console.error('Error populating customer info:', error);
    }
  }
};

const Order = mongoose.model('Order', orderSchema);

module.exports = Order; 