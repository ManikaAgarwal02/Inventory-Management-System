const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logActivity } = require('../services/activityLog.service');
const { ROLES } = require('../config/roles');

function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
  });
}

const register = catchAsync(async (req, res) => {
  const { name, email, password, role } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const requestedRole = role === ROLES.ADMIN && req.user?.role === ROLES.ADMIN
    ? ROLES.ADMIN
    : ROLES.STAFF;

  const user = await User.create({ name, email, password, role: requestedRole });

  await logActivity({
    user: user._id,
    action: 'register',
    entity: 'User',
    entityId: user._id,
    newValue: { name: user.name, email: user.email, role: user.role },
  });

  const token = signToken(user._id);

  res.status(201).json({
    success: true,
    data: { user, token },
  });
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'This account has been deactivated');
  }

  const token = signToken(user._id);

  await logActivity({
    user: user._id,
    action: 'login',
    entity: 'User',
    entityId: user._id,
  });

  res.status(200).json({
    success: true,
    data: { user, token },
  });
});

const logout = catchAsync(async (req, res) => {
  await logActivity({
    user: req.user._id,
    action: 'logout',
    entity: 'User',
    entityId: req.user._id,
  });

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

const getMe = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, data: { user: req.user } });
});

module.exports = { register, login, logout, getMe };
