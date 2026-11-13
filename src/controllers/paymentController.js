import { Payment, Business } from '../models/index.js';
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

const formatPaymentResponse = (payment) => ({
  id: payment._id,
  businessId: payment.businessId,
  reservationId: payment.reservationId,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.status,
  provider: payment.provider,
  providerPaymentId: payment.providerPaymentId,
  paidAt: payment.paidAt,
  refundedAt: payment.refundedAt,
  fecha_creacion: payment.createdAt,
  fecha_actualizacion: payment.updatedAt,
});

export const listPayments = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const business = await getDefaultBusiness();
  const filter = { businessId: business._id, ...(status ? { status } : {}) };

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Payment.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data: {
      payments: payments.map(formatPaymentResponse),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const getPaymentsSummary = asyncHandler(async (req, res) => {
  const business = await getDefaultBusiness();

  const grouped = await Payment.aggregate([
    { $match: { businessId: business._id } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        amount: { $sum: '$amount' },
        currencies: { $addToSet: '$currency' },
      },
    },
  ]);

  const byStatus = {};
  let total = 0;
  for (const entry of grouped) {
    byStatus[entry._id] = { count: entry.count, amount: entry.amount };
    total += entry.count;
  }

  const approved = byStatus.APPROVED || { count: 0, amount: 0, currency: null };
  const approvedCurrency = grouped.find((entry) => entry._id === 'APPROVED')?.currencies?.[0] || 'ARS';

  res.json({
    status: 'success',
    data: {
      total,
      byStatus,
      approvedCount: approved.count,
      approvedAmount: approved.amount,
      currency: approvedCurrency,
    },
  });
});

export const getPayment = asyncHandler(async (req, res) => {
  const business = await getDefaultBusiness();
  const payment = await Payment.findOne({ _id: req.params.id, businessId: business._id });
  if (!payment) {
    throw new NotFoundError('Pago');
  }

  res.json({
    status: 'success',
    data: formatPaymentResponse(payment),
  });
});
