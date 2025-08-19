const express = require('express');
const {
  getDashboard,
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getSystemStats
} = require('../controllers/admin.controller');
const { adminOnly, restrictTo } = require('../middleware/admin');

const router = express.Router();

// All routes in this router are protected and require admin role
router.use(adminOnly);

// Dashboard routes
router.get('/dashboard', getDashboard);
router.get('/stats', getSystemStats);

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

module.exports = router;
