import { Client, Business } from '../models/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError } from '../utils/AppError.js';

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

const formatClientResponse = (client) => ({
  id: client._id,
  businessId: client.businessId,
  name: client.name,
  phone: client.phone,
  email: client.email,
  notes: client.notes,
  fecha_creacion: client.createdAt,
  fecha_actualizacion: client.updatedAt,
});

export const listClients = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const business = await getDefaultBusiness();
  const filter = { businessId: business._id };

  const [clients, total] = await Promise.all([
    Client.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(limit),
    Client.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data: {
      clients: clients.map(formatClientResponse),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const getClient = asyncHandler(async (req, res) => {
  const business = await getDefaultBusiness();
  const client = await Client.findOne({ _id: req.params.id, businessId: business._id });
  if (!client) {
    throw new NotFoundError('Cliente');
  }

  res.json({
    status: 'success',
    data: formatClientResponse(client),
  });
});
