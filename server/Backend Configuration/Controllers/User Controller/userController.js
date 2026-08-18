const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logActivity } = require('../services/activityLog.service');


const getUsers = catchAsync(async (_req, res) => {
  const users = await User.find().sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: { users } });
});


const updateUserRole = catchAsync(async (req, res) => {
  const { role } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const previousRole = user.role;
  user.role = role;
  await user.save();

  await logActivity({
    user: req.user._id,
    action: 'update_role',
    entity: 'User',
    entityId: user._id,
    previousValue: { role: previousRole },
    newValue: { role: user.role },
  });

  res.status(200).json({ success: true, data: { user } });
});

const updateUserStatus = catchAsync(async (req, res) => {
  const { isActive } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');

  const previousStatus = user.isActive;
  user.isActive = isActive;
  await user.save();

  await logActivity({
    user: req.user._id,
    action: 'update_status',
    entity: 'User',
    entityId: user._id,
    previousValue: { isActive: previousStatus },
    newValue: { isActive: user.isActive },
  });

  res.status(200).json({ success: true, data: { user } });
});

module.exports = { getUsers, updateUserRole, updateUserStatus };
