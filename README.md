# 🍰 DesertShop - Sweet Delights E-commerce Platform

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.1.0-blue.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-8.15.0-green.svg)](https://www.mongodb.com/)
[![EJS](https://img.shields.io/badge/EJS-3.1.10-orange.svg)](https://ejs.co/)
[![License](https://img.shields.io/badge/License-ISC-blue.svg)](LICENSE)

A full-featured e-commerce platform specializing in delicious desserts, pastries, and sweet treats. Built with Node.js, Express, MongoDB, and EJS templating engine.

## ✨ Features

### 🛍️ **E-commerce Core**
- **Product Catalog**: Browse desserts by categories (Cakes, Cookies, Ice Cream, Pastries, Pies, Breads, Beverages)
- **Product Details**: Rich product information with ingredients, allergens, nutritional info, and customer reviews
- **Shopping Cart**: Add/remove items, quantity management, real-time cart updates
- **Wishlist**: Save favorite products for later
- **Order Management**: Complete order lifecycle from cart to delivery

### 👤 **User Management**
- **User Registration & Authentication**: Secure signup/login with email validation
- **Profile Management**: Update personal information, preferences, and privacy settings
- **Order History**: Track all past orders with detailed status
- **Address Management**: Multiple shipping addresses
- **Password Reset**: Secure password recovery via email

### 💳 **Payment & Checkout**
- **Multiple Payment Methods**: Credit cards, PayPal, Cash on delivery
- **Stripe Integration**: Secure payment processing
- **Order Confirmation**: Email notifications and order tracking
- **Tax & Shipping**: Automatic calculation and flexible shipping options

### 🎨 **User Experience**
- **Responsive Design**: Mobile-first approach with modern UI/UX
- **Search & Filter**: Find products quickly with advanced filtering
- **Product Reviews**: Customer ratings and detailed reviews
- **Discount System**: Percentage-based discounts with expiration dates
- **Stock Management**: Real-time inventory tracking

### 🔧 **Admin Panel**
- **Dashboard Analytics**: Sales reports, user statistics, and performance metrics
- **Product Management**: Add, edit, delete products with image upload
- **Order Management**: Process orders, update status, manage inventory
- **User Management**: View user profiles, manage roles, and permissions
- **Content Management**: Update website content and settings

### 🔒 **Security & Performance**
- **Session Management**: Secure user sessions with flash messages
- **Input Validation**: Comprehensive form validation and sanitization
- **Rate Limiting**: Protection against abuse and DDoS attacks
- **Error Handling**: Graceful error handling with user-friendly messages
- **Logging**: Comprehensive logging for debugging and monitoring

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v5.0 or higher)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/muhammedhelal35/Desert-Shop-E-commerce-platform-.git
   cd desertshop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # Database
   MONGODB_URI=mongodb://localhost:27017/desertshop
   
   # Session
   SESSION_SECRET=your-super-secret-session-key
   
   # Stripe (for payments)
   STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
   STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_publishable_key
   
   # Email (for notifications)
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   
   # Environment
   NODE_ENV=development
   PORT=3000
   ```

4. **Database Setup**
   ```bash
   # Start MongoDB (if not running)
   mongod
   
   # Create admin user (optional)
   node scripts/createAdmin.js
   ```

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Admin Panel: http://localhost:3000/admin

## 📁 Project Structure

```
DesertShop/
├── app.js                 # Main application entry point
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (create this)
├── .gitignore            # Git ignore rules
├── README.md             # This file
│
├── config/               # Configuration files
│   ├── db.js            # Database connection
│   └── passport.js      # Authentication configuration
│
├── models/              # MongoDB schemas
│   ├── User.js          # User model with authentication
│   ├── Product.js       # Product catalog model
│   ├── Order.js         # Order management model
│   └── Cart.js          # Shopping cart model
│
├── routes/              # Express routes
│   ├── auth.js          # Authentication routes
│   ├── products.js      # Product catalog routes
│   ├── cart.js          # Shopping cart routes
│   ├── orders.js        # Order management routes
│   ├── admin.js         # Admin panel routes
│   ├── wishlist.js      # Wishlist functionality
│   └── profile.js       # User profile routes
│
├── views/               # EJS templates
│   ├── layouts/         # Layout templates
│   ├── partials/        # Reusable components
│   ├── auth/           # Authentication pages
│   ├── products/       # Product pages
│   ├── cart/           # Shopping cart pages
│   ├── orders/         # Order pages
│   ├── admin/          # Admin panel pages
│   └── *.ejs           # Main pages
│
├── public/              # Static assets
│   ├── CSS/            # Stylesheets
│   ├── JS/             # JavaScript files
│   └── images/         # Images and uploads
│
├── middlewares/         # Custom middleware
│   └── auth.js         # Authentication middleware
│
├── validators/          # Input validation
│   └── auth.js         # Authentication validation
│
├── scripts/            # Utility scripts
│   └── createAdmin.js  # Admin user creation
│
└── logs/               # Application logs
```

## 🛠️ Technology Stack

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database with Mongoose ODM
- **EJS**: Embedded JavaScript templating
- **Passport.js**: Authentication middleware
- **bcrypt**: Password hashing
- **express-session**: Session management
- **connect-flash**: Flash messages
- **multer**: File upload handling

### Frontend
- **EJS Templates**: Server-side rendering
- **CSS3**: Modern styling with responsive design
- **JavaScript**: Interactive client-side functionality
- **Bootstrap**: UI framework (if used)

### Payment & Services
- **Stripe**: Payment processing
- **Nodemailer**: Email notifications
- **Twilio**: SMS notifications (optional)

### Development Tools
- **Nodemon**: Development server with auto-reload
- **Morgan**: HTTP request logging
- **Express Validator**: Input validation

## 🎯 Key Features Explained

### Product Management
- **Categories**: Organized product catalog with 9 dessert categories
- **Rich Product Data**: Includes ingredients, allergens, nutritional information
- **Image Management**: Product image upload and management
- **Inventory Control**: Real-time stock tracking and availability
- **Pricing**: Support for discounts and promotional pricing
- **Reviews**: Customer rating system with detailed reviews

### Shopping Experience
- **Cart System**: Persistent shopping cart with session storage
- **Wishlist**: Save products for future purchase
- **Search & Filter**: Find products by category, price, and availability
- **Responsive Design**: Optimized for desktop, tablet, and mobile

### Order Processing
- **Checkout Flow**: Streamlined checkout process
- **Payment Integration**: Multiple payment methods with Stripe
- **Order Tracking**: Real-time order status updates
- **Email Notifications**: Order confirmations and updates
- **Shipping Management**: Flexible shipping options and address management

### Admin Capabilities
- **Dashboard**: Sales analytics and performance metrics
- **Product CRUD**: Complete product lifecycle management
- **Order Management**: Process and track all customer orders
- **User Management**: Customer account administration
- **Inventory Control**: Stock management and alerts

## 🔧 Configuration

### Environment Variables
The application uses environment variables for configuration. See the `.env` example above for all required variables.

### Database Configuration
MongoDB connection is configured in `config/db.js`. The application supports both local and cloud MongoDB instances.

### Session Configuration
Sessions are configured with security best practices including secure cookies in production.

## 🚀 Deployment

### Local Development
```bash
npm run dev
```

### Production Deployment
1. Set `NODE_ENV=production` in your environment
2. Configure production database and services
3. Set up SSL certificates for secure connections
4. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start ecosystem.config.js
   ```

### Docker Deployment (Optional)
```bash
# Build the image
docker build -t desertshop .

# Run the container
docker run -p 3000:3000 desertshop
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


**DesertShop** - Bringing sweet moments to your doorstep! 🍰✨ 