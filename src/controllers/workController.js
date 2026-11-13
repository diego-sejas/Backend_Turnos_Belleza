import mongoose from 'mongoose';
import { Work, Professional, Business } from '../models/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/AppError.js';
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

const toPublicWork = (work) => ({
  id: work._id,
  titulo: work.titulo,
  descripcion: work.descripcion,
  categoria: work.categoria,
  imageUrls: (work.imageIds || []).map((id) => imageUrlFor(id)),
  fecha: work.fecha,
});

const formatWorkResponse = (work) => ({
  id: work._id,
  businessId: work.businessId,
  titulo: work.titulo,
  descripcion: work.descripcion,
  categoria: work.categoria,
  professional: work.professionalId && work.professionalId._id
    ? {
      id: work.professionalId._id,
      nombre: work.professionalId.nombre,
      apellido: work.professionalId.apellido,
    }
    : (work.professionalId || null),
  imageIds: work.imageIds || [],
  imageUrls: (work.imageIds || []).map((id) => imageUrlFor(id)),
  fecha: work.fecha,
  isPublished: work.isPublished,
  fecha_creacion: work.createdAt,
  fecha_actualizacion: work.updatedAt,
});

const validateProfessional = async (professionalId, businessId) => {
  if (!professionalId) return null;

  const professional = await Professional.findOne({ _id: professionalId, businessId });
  if (!professional) {
    throw new ValidationError('El profesional indicado no existe o no pertenece al negocio');
  }
  return professional._id;
};

const normalizeImageIds = (imageIds) => {
  if (!imageIds) return [];
  if (!Array.isArray(imageIds)) {
    throw new ValidationError('imageIds debe ser un array');
  }
  return [...new Set(imageIds.map((id) => String(id)))].map((id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError(`ID de imagen inválido: ${id}`);
    }
    return new mongoose.Types.ObjectId(id);
  });
};

export const listWorks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const business = await getDefaultBusiness();
  const filter = { businessId: business._id, isActive: true };

  const [works, total] = await Promise.all([
    Work.find(filter)
      .populate('professionalId', 'nombre apellido')
      .sort({ fecha: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Work.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data: {
      works: works.map(formatWorkResponse),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    },
  });
});

export const getWork = asyncHandler(async (req, res) => {
  const business = await getDefaultBusiness();
  const work = await Work.findOne({ _id: req.params.id, businessId: business._id })
    .populate('professionalId', 'nombre apellido');

  if (!work) {
    throw new NotFoundError('Trabajo');
  }

  res.json({ status: 'success', data: formatWorkResponse(work) });
});

export const createWork = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Solo administradores pueden crear trabajos');
  }

  const { titulo, descripcion, categoria, professionalId, imageIds, fecha, isPublished = false } = req.body;

  const business = await getDefaultBusiness();
  const resolvedProfessional = await validateProfessional(professionalId, business._id);
  const resolvedImages = normalizeImageIds(imageIds);

  const work = await Work.create({
    businessId: business._id,
    titulo,
    descripcion,
    categoria,
    professionalId: resolvedProfessional,
    imageIds: resolvedImages,
    fecha: fecha || undefined,
    isPublished,
  });

  const populated = await Work.findById(work._id).populate('professionalId', 'nombre apellido');

  res.status(201).json({
    status: 'success',
    message: 'Trabajo creado exitosamente',
    data: formatWorkResponse(populated),
  });
});

export const updateWork = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Solo administradores pueden modificar trabajos');
  }

  const { titulo, descripcion, categoria, professionalId, imageIds, fecha, isPublished } = req.body;

  const business = await getDefaultBusiness();
  const work = await Work.findOne({ _id: req.params.id, businessId: business._id });
  if (!work) {
    throw new NotFoundError('Trabajo');
  }

  const previousImageIds = (work.imageIds || []).map((id) => String(id));

  if (titulo !== undefined) work.titulo = titulo;
  if (descripcion !== undefined) work.descripcion = descripcion;
  if (categoria !== undefined) work.categoria = categoria;
  if (professionalId !== undefined) {
    work.professionalId = await validateProfessional(professionalId, business._id);
  }
  if (imageIds !== undefined) work.imageIds = normalizeImageIds(imageIds);
  if (fecha !== undefined) work.fecha = fecha || undefined;
  if (isPublished !== undefined) work.isPublished = isPublished;

  await work.save();

  const currentImageIds = (work.imageIds || []).map((id) => String(id));
  const removed = previousImageIds.filter((id) => !currentImageIds.includes(id));
  await Promise.all(removed.map((id) => deleteIfOrphaned(id)));

  const populated = await Work.findById(work._id).populate('professionalId', 'nombre apellido');
  res.json({
    status: 'success',
    message: 'Trabajo actualizado exitosamente',
    data: formatWorkResponse(populated),
  });
});

export const deleteWork = asyncHandler(async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    throw new ForbiddenError('Solo administradores pueden eliminar trabajos');
  }

  const business = await getDefaultBusiness();
  const work = await Work.findOne({ _id: req.params.id, businessId: business._id });
  if (!work) {
    throw new NotFoundError('Trabajo');
  }

  work.isActive = false;
  await work.save();

  res.json({
    status: 'success',
    message: 'Trabajo eliminado exitosamente',
    data: formatWorkResponse(work),
  });
});

export const listPublicWorks = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const business = await getDefaultBusiness();
  const filter = { businessId: business._id, isActive: true, isPublished: true };

  const [works, total] = await Promise.all([
    Work.find(filter)
      .sort({ fecha: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Work.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data: {
      works: works.map(toPublicWork),
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    },
  });
});
