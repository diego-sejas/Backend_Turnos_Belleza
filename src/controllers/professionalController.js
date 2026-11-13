import { Professional, Service, Business } from '../models/index.js';
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

const formatProfessionalResponse = (professional) => ({
  id: professional._id,
  businessId: professional.businessId,
  nombre: professional.nombre,
  apellido: professional.apellido,
  email: professional.email,
  phone: professional.phone,
  especialidades: professional.especialidades || '',
  imageId: professional.imageId || null,
  imageUrl: imageUrlFor(professional.imageId),
  services: professional.services || [],
  isActive: professional.isActive,
  fecha_creacion: professional.createdAt,
  fecha_actualizacion: professional.updatedAt,
});

const validateServices = async (serviceIds, businessId) => {
  if (!serviceIds || serviceIds.length === 0) return [];

  const uniqueServiceIds = [...new Set(serviceIds.map(id => id.toString()))];

  const services = await Service.find({
    _id: { $in: uniqueServiceIds },
    businessId: businessId,
  });

  if (services.length !== uniqueServiceIds.length) {
    const foundIds = services.map(s => s._id.toString());
    const missingIds = uniqueServiceIds.filter(id => !foundIds.includes(id));
    throw new ValidationError(`Los siguientes servicios no existen o no pertenecen al negocio: ${missingIds.join(', ')}`);
  }

  return uniqueServiceIds;
};

export const listProfessionals = asyncHandler(async (req, res) => {
  const { activeOnly = true, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const business = await getDefaultBusiness();
  const activeOnlyBool = activeOnly === 'true' || activeOnly === true;
  const filter = { businessId: business._id, ...(activeOnlyBool ? { isActive: true } : {}) };

  const [professionals, total] = await Promise.all([
    Professional.find(filter)
      .populate('services', 'name durationMinutes price currency')
      .sort({ nombre: 1, apellido: 1 })
      .skip(skip)
      .limit(limit),
    Professional.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data: {
      professionals: professionals.map(formatProfessionalResponse),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const getProfessional = asyncHandler(async (req, res) => {
  const business = await getDefaultBusiness();
  const professional = await Professional.findOne({ _id: req.params.id, businessId: business._id })
    .populate('services', 'name durationMinutes price currency');

  if (!professional) {
    throw new NotFoundError('Profesional');
  }

  res.json({
    status: 'success',
    data: formatProfessionalResponse(professional),
  });
});

export const createProfessional = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Solo administradores pueden crear profesionales');
  }

  const { nombre, apellido, email, phone, especialidades, imageId, services = [], isActive = true } = req.body;

  if (email) {
    const existingEmail = await Professional.findOne({ email, businessId: (await getDefaultBusiness())._id });
    if (existingEmail) {
      throw new ConflictError('Ya existe un profesional con ese email');
    }
  }

  const business = await getDefaultBusiness();
  const validatedServices = await validateServices(services, business._id);

  const professional = await Professional.create({
    businessId: business._id,
    nombre,
    apellido,
    email,
    phone,
    especialidades,
    imageId: imageId || null,
    services: validatedServices,
    isActive,
  });

  const populatedProfessional = await Professional.findById(professional._id).populate('services', 'name durationMinutes price currency');

  res.status(201).json({
    status: 'success',
    message: 'Profesional creado exitosamente',
    data: formatProfessionalResponse(populatedProfessional),
  });
});

export const updateProfessional = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Solo administradores pueden modificar profesionales');
  }

  const { nombre, apellido, email, phone, especialidades, imageId, services, isActive } = req.body;

  const business = await getDefaultBusiness();
  const professional = await Professional.findOne({ _id: req.params.id, businessId: business._id });
  if (!professional) {
    throw new NotFoundError('Profesional');
  }

  const previousImageId = professional.imageId ? String(professional.imageId) : null;

  if (email && email !== professional.email) {
    const existingEmail = await Professional.findOne({ email, businessId: business._id, _id: { $ne: professional._id } });
    if (existingEmail) {
      throw new ConflictError('Ya existe un profesional con ese email');
    }
    professional.email = email;
  }

  if (nombre !== undefined) professional.nombre = nombre;
  if (apellido !== undefined) professional.apellido = apellido;
  if (phone !== undefined) professional.phone = phone;
  if (especialidades !== undefined) professional.especialidades = especialidades;
  if (imageId !== undefined) professional.imageId = imageId || null;
  if (isActive !== undefined) professional.isActive = isActive;

  if (services !== undefined) {
    const validatedServices = await validateServices(services, business._id);
    professional.services = validatedServices;
  }

  await professional.save();

  const newImageId = professional.imageId ? String(professional.imageId) : null;
  if (previousImageId && previousImageId !== newImageId) {
    await deleteIfOrphaned(previousImageId);
  }

  const populatedProfessional = await Professional.findById(professional._id).populate('services', 'name durationMinutes price currency');

  res.json({
    status: 'success',
    message: 'Profesional actualizado exitosamente',
    data: formatProfessionalResponse(populatedProfessional),
  });
});

export const deleteProfessional = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Solo administradores pueden eliminar profesionales');
  }

  const business = await getDefaultBusiness();
  const professional = await Professional.findOne({ _id: req.params.id, businessId: business._id });
  if (!professional) {
    throw new NotFoundError('Profesional');
  }

  professional.isActive = false;
  await professional.save();

  res.json({
    status: 'success',
    message: 'Profesional desactivado exitosamente',
    data: formatProfessionalResponse(professional),
  });
});