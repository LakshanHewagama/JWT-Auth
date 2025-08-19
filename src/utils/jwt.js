// Cookie configuration helper
const getCookieOptions = (isProduction, expiryMs) => ({
  expires: new Date(Date.now() + expiryMs),
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/'
});

// Helper function to create and send tokens
const createSendToken = async (user, statusCode, res, rememberMe = false) => {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // Add refresh token to user's tokens array
  user.addRefreshToken(refreshToken);
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const isProduction = process.env.NODE_ENV === 'production';
  const refreshExpiry = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000;

  // Set cookies
  res.cookie('accessToken', accessToken, getCookieOptions(isProduction, 15 * 60 * 1000));
  res.cookie('refreshToken', refreshToken, getCookieOptions(isProduction, refreshExpiry));

  // Remove sensitive data from response
  user.password = undefined;
  user.refreshTokens = undefined;

  res.status(statusCode).json({
    status: 'success',
    message: 'Authentication successful',
    data: {
      user,
      accessToken,
      refreshToken,
      tokenExpiry: new Date(Date.now() + 15 * 60 * 1000)
    }
  });
};

// Helper function to get cookie options for clearing cookies
const getClearCookieOptions = (isProduction) => ({
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  path: '/'
});

module.exports = {
  getCookieOptions,
  createSendToken,
  getClearCookieOptions
};