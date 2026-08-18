const mongoose = require('mongoose');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logActivity } = require('../services/activityLog.service');

async function applyStockMovement({ productId, type, quantity, reason, userId }) {
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      const product = await Product.findById(productId).session(session);
      if (!product) throw new ApiError(404, 'Product not found');

      if (type === 'in') {
        product.currentStock += quantity;
      } else if (type === 'out') {
        if (product.currentStock < quantity) {
          throw new ApiError(400, `Insufficient stock: only ${product.currentStock} available`);
        }
        product.currentStock -= quantity;
      } else if (type === 'adjustment') {
  
        if (quantity < 0) throw new ApiError(400, 'Stock cannot be adjusted below zero');
        product.currentStock = quantity;
      }

      await product.save({ session });

      const [transaction] = await StockTransaction.create(
        [
          {
            product: product._id,
            type,
            quantity,
            reason,
            balanceAfter: product.currentStock,
            performedBy: userId,
          },
        ],
        { session }
      );

      result = { product, transaction };
    });
    return result;
  } finally {
    session.endSession();
  }
}

const stockIn = catchAsync(async (req, res) => {
  const { productId, quantity, reason } = req.body;
  if (!quantity || quantity <= 0) throw new ApiError(400, 'Quantity must be greater than 0');

  const { product, transaction } = await applyStockMovement({
    productId,
    type: 'in',
    quantity,
    reason,
    userId: req.user._id,
  });

  await logActivity({
    user: req.user._id,
    action: 'stock_in',
    entity: 'Product',
    entityId: product._id,
    newValue: { quantity, balanceAfter: product.currentStock },
  });

  res.status(201).json({ success: true, data: { product, transaction } });
});

const stockOut = catchAsync(async (req, res) => {
  const { productId, quantity, reason } = req.body;
  if (!quantity || quantity <= 0) throw new ApiError(400, 'Quantity must be greater than 0');

  const { product, transaction } = await applyStockMovement({
    productId,
    type: 'out',
    quantity,
    reason,
    userId: req.user._id,
  });

  await logActivity({
    user: req.user._id,
    action: 'stock_out',
    entity: 'Product',
    entityId: product._id,
    newValue: { quantity, balanceAfter: product.currentStock },
  });

  res.status(201).json({ success: true, data: { product, transaction } });
});


const stockAdjust = catchAsync(async (req, res) => {
  const { productId, newQuantity, reason } = req.body;
  if (newQuantity === undefined) throw new ApiError(400, 'newQuantity is required');
  if (!reason) throw new ApiError(400, 'A reason is required for stock adjustments');

  const { product, transaction } = await applyStockMovement({
    productId,
    type: 'adjustment',
    quantity: newQuantity,
    reason,
    userId: req.user._id,
  });

  await logActivity({
    user: req.user._id,
    action: 'stock_adjust',
    entity: 'Product',
    entityId: product._id,
    newValue: { newQuantity, reason },
  });

  res.status(201).json({ success: true, data: { product, transaction } });
});


const getTransactions = catchAsync(async (req, res) => {
  const { product, type, from, to } = req.query;
  const filter = {};
  if (product) filter.product = product;
  if (type) filter.type = type;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const transactions = await StockTransaction.find(filter)
    .populate('product', 'name sku')
    .populate('performedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(500);

  res.status(200).json({ success: true, results: transactions.length, data: { transactions } });
});


const getLowStockAlerts = catchAsync(async (_req, res) => {
  const products = await Product.find({ isActive: true }).populate('category', 'name');
  const lowStock = products.filter((p) => p.currentStock <= p.reorderLevel);

  res.status(200).json({ success: true, results: lowStock.length, data: { products: lowStock } });
});

module.exports = { stockIn, stockOut, stockAdjust, getTransactions, getLowStockAlerts };
