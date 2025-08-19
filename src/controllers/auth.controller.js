const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Token = require('../models/Token');
const { getCookieOptions, createSendToken, getClearCookieOptions } = require('../utils/jwt');

// Register new user
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        status: 'fail',
        message: 'User with this email already exists'
      });
    }

    // Create new user
    const newUser = await User.create({
      firstName,
      lastName,
      email,
      password
    });

    // Create and send token
    createSendToken(newUser, 201, res);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong during registration'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password, rememberMe } = req.body;
    const isProduction = process.env.NODE_ENV === 'production';
    const clearCookieOptions = getClearCookieOptions(isProduction);

    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      // Ensure any existing auth cookies are cleared on failed login
      res.clearCookie('accessToken', clearCookieOptions);
      res.clearCookie('refreshToken', clearCookieOptions);
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      // Clear cookies for deactivated accounts
      res.clearCookie('accessToken', clearCookieOptions);
      res.clearCookie('refreshToken', clearCookieOptions);
      return res.status(401).json({
        status: 'fail',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Create and send token
    createSendToken(user, 200, res, rememberMe);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong during login'
    });
  }
};

// Logout user
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
      const user = await User.findByRefreshToken(refreshToken);
      if (user) {
        user.removeRefreshToken(refreshToken);
        await user.save({ validateBeforeSave: false });
      }

      // Blacklist the refresh token
      try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        await Token.create({
          token: refreshToken,
          type: 'refresh',
          userId: decoded.id,
          blacklisted: true,
          expiresAt: new Date(decoded.exp * 1000)
        });
      } catch (err) {
        // Token might be expired or invalid, ignore
      }
    }

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = getClearCookieOptions(isProduction);
    
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    res.json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong during logout'
    });
  }
};

// Refresh access token
const refreshToken = async (req, res) => {
  try {
    const user = req.user;
    const oldRefreshToken = req.refreshToken;

    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    // Update user's refresh tokens
    user.removeRefreshToken(oldRefreshToken);
    user.addRefreshToken(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    // Blacklist old refresh token
    try {
      const decoded = jwt.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET);
      await Token.create({
        token: oldRefreshToken,
        type: 'refresh',
        userId: decoded.id,
        blacklisted: true,
        expiresAt: new Date(decoded.exp * 1000)
      });
    } catch (err) {
      // Ignore if token verification fails
    }

    const isProduction = process.env.NODE_ENV === 'production';

    // Set new tokens in cookies
    res.cookie('accessToken', newAccessToken, getCookieOptions(isProduction, 15 * 60 * 1000));
    res.cookie('refreshToken', newRefreshToken, getCookieOptions(isProduction, 7 * 24 * 60 * 60 * 1000));

    res.json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        tokenExpiry: new Date(Date.now() + 15 * 60 * 1000)
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong during token refresh'
    });
  }
};

// Forgot password
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'No user found with that email address'
      });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // TODO: Implement email service for password reset
    res.json({
      status: 'success',
      message: 'Password reset token generated',
      resetToken // Remove this in production
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong processing your request'
    });
  }
};

// Reset password
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'Token is invalid or has expired'
      });
    }

    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong resetting your password'
    });
  }
};

// Change password (for logged-in users)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, password } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    if (!(await user.correctPassword(currentPassword, user.password))) {
      return res.status(400).json({
        status: 'fail',
        message: 'Your current password is incorrect'
      });
    }

    user.password = password;
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong changing your password'
    });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong fetching user data'
    });
  }
};

// Update user profile
const updateMe = async (req, res) => {
  try {
    const { firstName, lastName, email } = req.body;

    if (req.body.password || req.body.passwordConfirm) {
      return res.status(400).json({
        status: 'fail',
        message: 'This route is not for password updates. Please use /change-password'
      });
    }

    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'fail',
          message: 'Email already in use'
        });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, email },
      { new: true, runValidators: true }
    );

    res.json({
      status: 'success',
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong updating your profile'
    });
  }
};

// Deactivate user account
const deleteMe = async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { isActive: false });
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Something went wrong deactivating your account'
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe,
  updateMe,
  deleteMe
};
