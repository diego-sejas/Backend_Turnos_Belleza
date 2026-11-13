import { Service, Professional, Business } from '../models/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { imageUrlFor } from '../utils/imageUrl.js';

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

const PUBLIC_SERVICE_FIELDS =
  'name description durationMinutes price currency requiresDeposit depositAmount depositType imageId';
const PUBLIC_PROFESSIONAL_FIELDS = 'nombre apellido especialidades imageId services';
const PUBLIC_PROFESSIONAL_SERVICE_FIELDS = 'name durationMinutes price currency';

const toPublicService = (service) => ({
  id: service._id,
  name: service.name,
  description: service.description,
  durationMinutes: service.durationMinutes,
  price: service.price,
  currency: service.currency,
  requiresDeposit: service.requiresDeposit,
  depositAmount: service.depositAmount,
  depositType: service.depositType,
  imageUrl: imageUrlFor(service.imageId),
});

const toPublicProfessional = (professional) => ({
  id: professional._id,
  nombre: professional.nombre,
  apellido: professional.apellido,
  especialidades: professional.especialidades || '',
  imageUrl: imageUrlFor(professional.imageId),
  services: (professional.services || []).map((service) => ({
    id: service._id,
    name: service.name,
    durationMinutes: service.durationMinutes,
    price: service.price,
    currency: service.currency,
  })),
});

export const listPublicServices = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const business = await getDefaultBusiness();
  const filter = { businessId: business._id, isActive: true };

  const [services, total] = await Promise.all([
    Service.find(filter)
      .select(PUBLIC_SERVICE_FIELDS)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Service.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data: {
      services: services.map(toPublicService),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const listPublicProfessionals = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const business = await getDefaultBusiness();
  const filter = { businessId: business._id, isActive: true };

  const [professionals, total] = await Promise.all([
    Professional.find(filter)
      .select(PUBLIC_PROFESSIONAL_FIELDS)
      .populate('services', PUBLIC_PROFESSIONAL_SERVICE_FIELDS)
      .sort({ nombre: 1, apellido: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Professional.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data: {
      professionals: professionals.map(toPublicProfessional),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});
