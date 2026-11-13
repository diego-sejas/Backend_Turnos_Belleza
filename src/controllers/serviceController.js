import { Service, Business } from '../models/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../utils/AppError.js';
import { imageUrlFor } from '../utils/imageUrl.js';
import { deleteIfOrphaned } from '../services/imageService.js';

const getDefaultBusiness = async () => {
  let business = await Business.findOne();
  if (!business) {
    business = await Business.create({
      name: 'Sistema Belleza',
      slug: 'sistema-belleza',
    });
  }
  return business;
};

const formatServiceResponse = (service) => ({
  id: service._id,
  businessId: service.businessId,
  name: service.name,
  slug: service.slug,
  description: service.description,
  durationMinutes: service.durationMinutes,
  price: service.price,
  currency: service.currency,
  requiresDeposit: service.requiresDeposit,
  depositAmount: service.depositAmount,
  depositType: service.depositType,
  imageId: service.imageId || null,
  imageUrl: imageUrlFor(service.imageId),
  isActive: service.isActive,
  fecha_creacion: service.createdAt,
  fecha_actualizacion: service.updatedAt,
});

export const listServices = asyncHandler(async (req, res) => {
  const { activeOnly = true, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const business = await getDefaultBusiness();
  const activeOnlyBool = activeOnly === 'true' || activeOnly === true;
  const filter = { businessId: business._id, ...(activeOnlyBool ? { isActive: true } : {}) };

  const [services, total] = await Promise.all([
    Service.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Service.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data: {
      services: services.map(formatServiceResponse),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const getService = asyncHandler(async (req, res) => {
  const business = await getDefaultBusiness();
  const service = await Service.findOne({ _id: req.params.id, businessId: business._id });
  if (!service) {
    throw new NotFoundError('Servicio');
  }

  res.json({
    status: 'success',
    data: formatServiceResponse(service),
  });
});

export const createService = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Solo administradores pueden crear servicios');
  }

  const { name, description, durationMinutes, price, currency = 'ARS', requiresDeposit = false, depositAmount, depositType = 'fixed', imageId, isActive = true } = req.body;

  if (requiresDeposit && (!depositAmount || depositAmount <= 0)) {
    throw new ValidationError('depositAmount es obligatorio y debe ser mayor a 0 cuando requiresDeposit es true');
  }

  if (requiresDeposit && depositType === 'percentage' && depositAmount > 100) {
    throw new ValidationError('El porcentaje de depósito no puede ser mayor a 100');
  }

  const business = await getDefaultBusiness();
  const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const existingSlug = await Service.findOne({ slug, businessId: business._id });
  if (existingSlug) {
    throw new ConflictError('Ya existe un servicio con ese nombre (slug duplicado)');
  }

  const service = await Service.create({
    businessId: business._id,
    name,
    slug,
    description,
    durationMinutes,
    price,
    currency,
    requiresDeposit,
    depositAmount: requiresDeposit ? depositAmount : undefined,
    depositType: requiresDeposit ? depositType : 'fixed',
    imageId: imageId || null,
    isActive,
  });

  res.status(201).json({
    status: 'success',
    message: 'Servicio creado exitosamente',
    data: formatServiceResponse(service),
  });
});

export const updateService = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Solo administradores pueden modificar servicios');
  }

  const { name, description, durationMinutes, price, currency, requiresDeposit, depositAmount, depositType, imageId, isActive } = req.body;

  const business = await getDefaultBusiness();
  const service = await Service.findOne({ _id: req.params.id, businessId: business._id });
  if (!service) {
    throw new NotFoundError('Servicio');
  }

  const previousImageId = service.imageId ? String(service.imageId) : null;

  if (name && name !== service.name) {
    const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const existingSlug = await Service.findOne({ slug, businessId: business._id, _id: { $ne: service._id } });
    if (existingSlug) {
      throw new ConflictError('Ya existe un servicio con ese nombre');
    }
    service.slug = slug;
    service.name = name;
  }

  if (description !== undefined) service.description = description;
  if (durationMinutes !== undefined) service.durationMinutes = durationMinutes;
  if (price !== undefined) service.price = price;
  if (currency !== undefined) service.currency = currency;
  if (isActive !== undefined) service.isActive = isActive;
  if (imageId !== undefined) service.imageId = imageId || null;

  if (requiresDeposit !== undefined) {
    service.requiresDeposit = requiresDeposit;
    if (requiresDeposit) {
      if (!depositAmount || depositAmount <= 0) {
        throw new ValidationError('depositAmount es obligatorio y debe ser mayor a 0 cuando requiresDeposit es true');
      }
      if (depositType === 'percentage' && depositAmount > 100) {
        throw new ValidationError('El porcentaje de depósito no puede ser mayor a 100');
      }
      service.depositAmount = depositAmount;
      service.depositType = depositType || 'fixed';
    } else {
      service.depositAmount = undefined;
      service.depositType = 'fixed';
    }
  } else if (depositAmount !== undefined || depositType !== undefined) {
    if (service.requiresDeposit) {
      if (depositAmount !== undefined && depositAmount <= 0) {
        throw new ValidationError('depositAmount debe ser mayor a 0');
      }
      if (depositType === 'percentage' && depositAmount > 100) {
        throw new ValidationError('El porcentaje de depósito no puede ser mayor a 100');
      }
      if (depositAmount !== undefined) service.depositAmount = depositAmount;
      if (depositType !== undefined) service.depositType = depositType;
    }
  }

  await service.save();

  const newImageId = service.imageId ? String(service.imageId) : null;
  if (previousImageId && previousImageId !== newImageId) {
    await deleteIfOrphaned(previousImageId);
  }

  res.json({
    status: 'success',
    message: 'Servicio actualizado exitosamente',
    data: formatServiceResponse(service),
  });
});

export const deleteService = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Solo administradores pueden eliminar servicios');
  }

  const business = await getDefaultBusiness();
  const service = await Service.findOne({ _id: req.params.id, businessId: business._id });
  if (!service) {
    throw new NotFoundError('Servicio');
  }

  service.isActive = false;
  await service.save();

  res.json({
    status: 'success',
    message: 'Servicio desactivado exitosamente',
    data: formatServiceResponse(service),
  });
});