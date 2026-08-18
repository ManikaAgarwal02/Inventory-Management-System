const Supplier = require('../models/Supplier');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { logActivity } = require('../services/activityLog.service');

const getSuppliers = catchAsync(async (_req, res) => {
  const suppliers = await Supplier.find().populate('productsSupplied', 'name sku').sort({ name: 1 });
  res.status(200).json({ success: true, data: { suppliers } });
});

const getSupplier = catchAsync(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id).populate('productsSupplied', 'name sku');
  if (!supplier) throw new ApiError(404, 'Supplier not found');
  res.status(200).json({ success: true, data: { supplier } });
});

const createSupplier = catchAsync(async (req, res) => {
  const supplier = await Supplier.create(req.body);
  await logActivity({
    user: req.user._id,
    action: 'create',
    entity: 'Supplier',
    entityId: supplier._id,
    newValue: supplier.toJSON(),
  });
  res.status(201).json({ success: true, data: { supplier } });
});

const updateSupplier = catchAsync(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw new ApiError(404, 'Supplier not found');

  const previousValue = supplier.toJSON();
  Object.assign(supplier, req.body);
  await supplier.save();

  await logActivity({
    user: req.user._id,
    action: 'update',
    entity: 'Supplier',
    entityId: supplier._id,
    previousValue,
    newValue: supplier.toJSON(),
  });

  res.status(200).json({ success: true, data: { supplier } });
});

const deleteSupplier = catchAsync(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw new ApiError(404, 'Supplier not found');

  await supplier.deleteOne();

  await logActivity({
    user: req.user._id,
    action: 'delete',
    entity: 'Supplier',
    entityId: supplier._id,
    previousValue: supplier.toJSON(),
  });

  res.status(200).json({ success: true, message: 'Supplier deleted' });
});

module.exports = { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier };
