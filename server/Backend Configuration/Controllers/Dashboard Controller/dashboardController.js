const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const PurchaseOrder = require('../models/PurchaseOrder');
const StockTransaction = require('../models/StockTransaction');
const catchAsync = require('../utils/catchAsync');

const getStats = catchAsync(async (_req, res) => {
  const products = await Product.find({ isActive: true });

  const totalProducts = products.length;
  const totalStockUnits = products.reduce((sum, p) => sum + p.currentStock, 0);
  const stockValue = products.reduce((sum, p) => sum + p.currentStock * p.purchasePrice, 0);
  const lowStockCount = products.filter((p) => p.currentStock <= p.reorderLevel && p.currentStock > 0).length;
  const outOfStockCount = products.filter((p) => p.currentStock === 0).length;

  const totalSuppliers = await Supplier.countDocuments({ isActive: true });
  const pendingOrders = await PurchaseOrder.countDocuments({ status: 'pending' });

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const todaysTransactions = await StockTransaction.countDocuments({ createdAt: { $gte: startOfToday } });

  res.status(200).json({
    success: true,
    data: {
      totalProducts,
      totalStockUnits,
      stockValue,
      lowStockCount,
      outOfStockCount,
      totalSuppliers,
      pendingOrders,
      todaysTransactions,
    },
  });
});

module.exports = { getStats };
