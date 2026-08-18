const mongoose = require('mongoose');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const StockTransaction = require('../models/StockTransaction');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logActivity } = require('../services/activityLog.service');

const geturchaseOrders = catchAsync(async (_req, res) => {
  const orders = await PurchaseOrder.find()
    .populate('supplier', 'name')
    .populate('items.product', 'name sku')
    .populate('orderedBy', 'name')
    .sort({ createdAt: -1 });
  res.status(200).json({ success: true, data: { orders } });
});

const getPurchaseOrder = catchAsync(async (req, res) => {
  const order = await PurchaseOrder.findById(req.params.id)
    .populate('supplier', 'name')
    .populate('items.product', 'name sku')
    .populate('orderedBy', 'name');
  if (!order) throw new ApiError(404, 'Purchase order not found');
  res.status(200).json({ success: true, data: { order } });
});

const createPurchaseOrder = catchAsync(async (req, res) => {
  const { supplier, items } = req.body;

  const order = await PurchaseOrder.create({
    supplier,
    items,
    orderedBy: req.user._id,
  });

  await logActivity({
    user: req.user._id,
    action: 'create',
    entity: 'PurchaseOrder',
    entityId: order._id,
    newValue: order.toJSON(),
  });

  res.status(201).json({ success: true, data: { order } });
});


const receivePurchaseOrder = catchAsync(async (req, res) => {
  const session = await mongoose.startSession();
  let order;

  try {
    await session.withTransaction(async () => {
      order = await PurchaseOrder.findById(req.params.id).session(session);
      if (!order) throw new ApiError(404, 'Purchase order not found');
      if (order.status === 'received') throw new ApiError(400, 'This order was already received');
      if (order.status === 'cancelled') throw new ApiError(400, 'This order was cancelled');

      for (const item of order.items) {
        const product = await Product.findById(item.product).session(session);
        if (!product) continue;

        product.currentStock += item.quantity;
        await product.save({ session });

        await StockTransaction.create(
          [
            {
              product: product._id,
              type: 'in',
              quantity: item.quantity,
              reason: `Goods received — PO ${order._id}`,
              balanceAfter: product.currentStock,
              performedBy: req.user._id,
            },
          ],
          { session }
        );
      }

      order.status = 'received';
      order.receivedDate = new Date();
      await order.save({ session });
    });
  } finally {
    session.endSession();
  }

  await logActivity({
    user: req.user._id,
    action: 'receive_goods',
    entity: 'PurchaseOrder',
    entityId: order._id,
    newValue: { status: 'received' },
  });

  res.status(200).json({ success: true, data: { order } });
});

const cancelPurchaseOrder = catchAsync(async (req, res) => {
  const order = await PurchaseOrder.findById(req.params.id);
  if (!order) throw new ApiError(404, 'Purchase order not found');
  if (order.status === 'received') throw new ApiError(400, 'Cannot cancel a received order');

  order.status = 'cancelled';
  await order.save();

  await logActivity({
    user: req.user._id,
    action: 'cancel',
    entity: 'PurchaseOrder',
    entityId: order._id,
    newValue: { status: 'cancelled' },
  });

  res.status(200).json({ success: true, data: { order } });
});

module.exports = {
  getPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
};
