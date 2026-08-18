const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logActivity } = require('../services/activityLog.service');

const getProducts = catchAsync(async (req, res) => {
  const { search, category, lowStock } = req.query;
  const filter = {};

  if (search) filter.$text = { $search: search };
  if (category) filter.category = category;

  let query = Product.find(filter).populate('category', 'name').sort({ name: 1 });
  let products = await query;

  if (lowStock === 'true') {
    products = products.filter((p) => p.currentStock <= p.reorderLevel);
  }

  res.status(200).json({ success: true, results: products.length, data: { products } });
});

const getProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id).populate('category', 'name');
  if (!product) throw new ApiError(404, 'Product not found');
  res.status(200).json({ success: true, data: { product } });
});

const createProduct = catchAsync(async (req, res) => {
  const product = await Product.create(req.body);

  await logActivity({
    user: req.user._id,
    action: 'create',
    entity: 'Product',
    entityId: product._id,
    newValue: product.toJSON(),
  });

  res.status(201).json({ success: true, data: { product } });
});

const updateProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  const previousValue = product.toJSON();

  const { currentStock, ...updates } = req.body;
  Object.assign(product, updates);
  await product.save();

  await logActivity({
    user: req.user._id,
    action: 'update',
    entity: 'Product',
    entityId: product._id,
    previousValue,
    newValue: product.toJSON(),
  });

  res.status(200).json({ success: true, data: { product } });
});

const deleteProduct = catchAsync(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  await product.deleteOne();

  await logActivity({
    user: req.user._id,
    action: 'delete',
    entity: 'Product',
    entityId: product._id,
    previousValue: product.toJSON(),
  });

  res.status(200).json({ success: true, message: 'Product deleted' });
});

module.exports = { getProducts, getProduct, createProduct, updateProduct, deleteProduct };
