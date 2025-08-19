const express = require('express');
const {
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
} = require('../controllers/admin.controller');
const { adminOnly, restrictTo } = require('../middleware/admin');

const router = express.Router();

// All routes in this router are protected and require admin role
router.use(adminOnly);

// User management routes
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.patch('/users/:id/role', updateUserRole);
router.patch('/users/:id/status', toggleUserStatus);
router.delete('/users/:id', deleteUser);

module.exports = router;
