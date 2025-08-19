const { promisify } = require('util');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to check if user is admin
const adminOnly = async (req, res, next) => {
  try {
    // Check if user is authenticated first
    let token;
    
    // Check for token in Authorization header first
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // If no Authorization header, check for access token in cookies
    else if (req.cookies.accessToken) {
      token = req.cookies.accessToken;
    }

    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'You are not logged in! Please log in to get access.'
      });
    }

    // Verify token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    // Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'The user belonging to this token no longer exists.'
      });
    }

    // Check if user changed password after the token was issued
    if (currentUser.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        status: 'fail',
        message: 'User recently changed password! Please log in again.'
      });
    }

    // Check if user is admin
    if (currentUser.role !== 'admin') {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to access this resource. Admin access required.'
      });
    }

    // Grant access to admin area
    req.user = currentUser;
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token. Please log in again.'
    });
  }
};

// Middleware to restrict access to specific roles
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'You do not have permission to perform this action.'
      });
    }
    next();
  };
};

module.exports = {
  adminOnly,
  restrictTo
};
