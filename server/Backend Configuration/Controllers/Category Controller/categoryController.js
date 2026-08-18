const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logActivity } = require('../services/activityLog.service');

const getCategories = catchAsync(async (_req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.status(200).json({ success: true, data: { categories } });
});

const createCategory = catchAsync(async (req, res) => {
  const category = await Category.create(req.body);
  await logActivity({
    user: req.user._id,
    action: 'create',
    entity: 'Category',
    entityId: category._id,
    newValue: category.toJSON(),
  });
  res.status(201).json({ success: true, data: { category } });
});

const updateCategory = catchAsync(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  const previousValue = category.toJSON();
  Object.assign(category, req.body);
  await category.save();

  await logActivity({
    user: req.user._id,
    action: 'update',
    entity: 'Category',
    entityId: category._id,
    previousValue,
    newValue: category.toJSON(),
  });

  res.status(200).json({ success: true, data: { category } });
});

const deleteCategory = catchAsync(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw new ApiError(404, 'Category not found');

  await category.deleteOne();

  await logActivity({
    user: req.user._id,
    action: 'delete',
    entity: 'Category',
    entityId: category._id,
    previousValue: category.toJSON(),
  });

  res.status(200).json({ success: true, message: 'Category deleted' });
});

module.exports = { getCategories, createCategory, updateCategory, deleteCategory };
