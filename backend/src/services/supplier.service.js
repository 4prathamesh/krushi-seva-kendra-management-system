'use strict';

import Supplier from '../models/supplier.model.js';

export const getAllSuppliers = async ({ search } = {}) => {
  const filter = { isActive: true };
  if (search && search.trim()) {
    const e = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.name = { $regex: e, $options: 'i' };
  }
  return Supplier.find(filter).sort({ name: 1 }).lean();
};

export const findOrCreateSupplier = async ({ name, phone = '', address = '', gstin = '' }) => {
  // Try to find by name (case-insensitive)
  let supplier = await Supplier.findOne({
    name: { $regex: `^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
  });
  if (!supplier) {
    supplier = await Supplier.create({ name: name.trim(), phone, address, gstin });
  }
  return supplier;
};

export const createSupplier = async (data) => {
  return Supplier.create(data);
};

export const updateSupplier = async (id, data) => {
  const supplier = await Supplier.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  if (!supplier) throw { status: 404, message: 'Supplier not found' };
  return supplier;
};
