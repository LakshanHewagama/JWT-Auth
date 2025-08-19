const User = require('../models/User');
const Token = require('../models/Token');


// Get all users with pagination
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select('firstName lastName email role isActive createdAt lastLogin')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      status: 'success',
      data: {
        users,
        pagination: {
          currentPage: page,
          totalPages,
          totalUsers,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users'
    });
  }
};

// Get user by ID
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('firstName lastName email role isActive createdAt lastLogin passwordChangedAt');

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user'
    });
  }
};

// Update user role
const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const userId = req.params.id;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        status: 'fail',
        message: 'Invalid role. Must be either "user" or "admin"'
      });
    }

    if (userId === req.user.id.toString()) {
      return res.status(400).json({
        status: 'fail',
        message: 'You cannot change your own role'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true, runValidators: true }
    ).select('firstName lastName email role isActive');

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user role'
    });
  }
};

// Toggle user active status
const toggleUserStatus = async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user.id.toString()) {
      return res.status(400).json({
        status: 'fail',
        message: 'You cannot deactivate your own account'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    user.isActive = !user.isActive;
    await user.save({ validateBeforeSave: false });

    res.json({
      status: 'success',
      data: { 
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive
        }
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error updating user status'
    });
  }
};

// Delete user (soft delete by deactivating)
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    if (userId === req.user.id.toString()) {
      return res.status(400).json({
        status: 'fail',
        message: 'You cannot delete your own account'
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select('firstName lastName email role isActive');

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'User not found'
      });
    }

    res.json({
      status: 'success',
      message: 'User deactivated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error deleting user'
    });
  }
};
// Get system statistics
const getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      totalTokens,
      activeUsers,
      blacklistedTokens,
      usersByRole
    ] = await Promise.all([
      User.countDocuments(),
      Token.countDocuments(),
      User.countDocuments({ isActive: true }),
      Token.countDocuments({ blacklisted: true }),
      User.aggregate([
        {
          $group: {
            _id: '$role',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const stats = {
      database: {
        totalUsers,
        totalTokens,
        activeUsers,
        blacklistedTokens
      },
      server: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development'
      },
      usersByRole
    };

    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching system statistics'
    });
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getSystemStats
};
