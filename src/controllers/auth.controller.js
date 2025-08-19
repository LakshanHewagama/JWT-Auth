const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Token = require('../models/Token');

// Helper function to create and send tokens
const createSendToken = async (user, statusCode, res, rememberMe = false) => {
  // Generate tokens
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Add refresh token to user's refresh tokens array
  user.addRefreshToken(refreshToken);
  await user.save({ validateBeforeSave: false });

  // Cookie options for access token (shorter expiry)
  const accessTokenOptions = {
    expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  };

  // Cookie options for refresh token (longer expiry)
  const refreshTokenOptions = {
    expires: rememberMe 
      ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days if remember me
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days default
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/'
  };

  // Set both access and refresh token cookies
  res.cookie('accessToken', accessToken, accessTokenOptions);
  res.cookie('refreshToken', refreshToken, refreshTokenOptions);

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  // Remove password from output
  user.password = undefined;
  user.refreshTokens = undefined;

  res.status(statusCode).json({
    status: 'success',
    message: 'Authentication successful',
    data: {
      user,
      accessToken, // Return in response body as well
      refreshToken, // Return in response body as well
      tokenExpiry: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
    }
  });

  console.log(`Access Token: ${accessToken}`);
  console.log(`Refresh Token: ${refreshToken}`);
};

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

    // Check if user exists and password is correct
    const user = await User.findOne({ email }).select('+password');

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'Incorrect email or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
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

    // Remove refresh token from user's tokens array
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
        console.log('Token verification failed during logout:', err.message);
      }
    }

    // Clear both access and refresh token cookies with the same options used when setting them
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };
    
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    res.status(200).json({
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

    // Generate new tokens
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    // Remove old refresh token and add new one
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

    // Cookie options for access token
    const accessTokenOptions = {
      expires: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };

    // Cookie options for refresh token
    const refreshTokenOptions = {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/'
    };

    // Set both new tokens in cookies
    res.cookie('accessToken', newAccessToken, accessTokenOptions);
    res.cookie('refreshToken', newRefreshToken, refreshTokenOptions);

    res.status(200).json({
      status: 'success',
      message: 'Token refreshed successfully',
      data: {
        accessToken: newAccessToken,
        tokenExpiry: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
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

    // Get user based on posted email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'There is no user with that email address'
      });
    }

    // Generate random reset token
    const resetToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    // For now, just return the token (in production, send via email)
    // TODO: Implement email service for password reset
    res.status(200).json({
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

    // Get user based on the token
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    // If token has not expired and there is a user, set the new password
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

    // Log in the user and send JWT
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

    // Get user from collection (with password field)
    const user = await User.findById(req.user.id).select('+password');

    // Check if posted current password is correct
    if (!(await user.correctPassword(currentPassword, user.password))) {
      return res.status(400).json({
        status: 'fail',
        message: 'Your current password is incorrect'
      });
    }

    // If so, update password
    user.password = password;
    await user.save();

    // Log user in, send JWT
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

    res.status(200).json({
      status: 'success',
      data: {
        user
      }
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

    // Check if user is trying to update password
    if (req.body.password || req.body.passwordConfirm) {
      return res.status(400).json({
        status: 'fail',
        message: 'This route is not for password updates. Please use /change-password'
      });
    }

    // Check if email already exists (if updating email)
    if (email && email !== req.user.email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          status: 'fail',
          message: 'Email already in use'
        });
      }
    }

    // Update user document
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { firstName, lastName, email },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'Profile updated successfully',
      data: {
        user: updatedUser
      }
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
