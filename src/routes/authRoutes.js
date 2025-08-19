const express = require('express');
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/auth.controller');
const { protect, verifyRefreshToken } = require('../middleware/auth');
const { 
  validate,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  updateProfileSchema
} = require('../validators/auth.schemas');

const router = express.Router();

// Rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 requests per windowMs
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    status: 'error',
    message: 'Too many password reset attempts, please try again later.'
  }
});

// Public routes
router.post('/register', 
  authLimiter,
  validate(registerSchema), 
  authController.register
);

router.post('/login', 
  authLimiter,
  validate(loginSchema), 
  authController.login
);

router.post('/forgot-password', 
  passwordResetLimiter,
  validate(forgotPasswordSchema), 
  authController.forgotPassword
);

router.post('/reset-password', 
  authLimiter,
  validate(resetPasswordSchema), 
  authController.resetPassword
);

// Token refresh route
router.post('/refresh-token', verifyRefreshToken, authController.refreshToken);

// Logout route (should not require access token, just refresh token from cookies)
router.post('/logout', authController.logout);

// Add a test route to check cookies
router.get('/check-cookies', (req, res) => {
  res.json({
    cookies: req.cookies,
    headers: req.headers,
    hasRefreshToken: !!req.cookies.refreshToken,
    note: 'Access tokens are not stored in cookies - only in Authorization header'
  });
});

// Protected routes (require authentication)
router.use(protect); // All routes after this middleware are protected
router.get('/me', authController.getMe);
router.patch('/update-me', validate(updateProfileSchema), authController.updateMe);
router.delete('/delete-me', authController.deleteMe);
router.post('/change-password', validate(changePasswordSchema), authController.changePassword);


module.exports = router;
