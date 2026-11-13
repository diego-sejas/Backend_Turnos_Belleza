import { Reservation, Business, Client, Professional, Service, Schedule, ScheduleBlock, ProfessionalLock } from '../models/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, AppError } from '../utils/AppError.js';
import { getDateInTimezone, getTimeInTimezoneMinutes, getDateRangesForReservation } from '../utils/dateTime.js';

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

const formatReservationResponse = (reservation) => ({
  id: reservation._id,
  businessId: reservation.businessId,
  clientId: reservation.clientId,
  professionalId: reservation.professionalId,
  serviceId: reservation.serviceId,
  status: reservation.status,
  startTime: reservation.startTime,
  endTime: reservation.endTime,
  timezone: reservation.timezone,
  price: reservation.price,
  currency: reservation.currency,
  requiresDeposit: reservation.requiresDeposit,
  depositAmount: reservation.depositAmount,
  depositPaid: reservation.depositPaid,
  paymentId: reservation.paymentId,
  notes: reservation.notes,
  expiresAt: reservation.expiresAt,
  confirmedAt: reservation.confirmedAt,
  cancelledAt: reservation.cancelledAt,
  completedAt: reservation.completedAt,
  createdAt: reservation.createdAt,
  updatedAt: reservation.updatedAt,
});

const hasOverlap = (newStart, newEnd, existingStart, existingEnd) => {
  return newStart < existingEnd && newEnd > existingStart;
};

const getActiveStatusesThatBlock = () => {
  return ['CONFIRMED', 'IN_PROGRESS', 'PENDING'];
};

export const listReservations = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const business = await getDefaultBusiness();
  const filter = { businessId: business._id, ...(status ? { status } : {}) };

  const [reservations, total] = await Promise.all([
    Reservation.find(filter)
      .populate('clientId', 'name phone')
      .populate('professionalId', 'nombre apellido')
      .populate('serviceId', 'name durationMinutes price currency')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit),
    Reservation.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data: {
      reservations: reservations.map(formatReservationResponse),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const getReservation = asyncHandler(async (req, res) => {
  const business = await getDefaultBusiness();
  const reservation = await Reservation.findOne({ _id: req.params.id, businessId: business._id })
    .populate('clientId', 'name phone')
    .populate('professionalId', 'nombre apellido')
    .populate('serviceId', 'name durationMinutes price currency');

  if (!reservation) {
    throw new NotFoundError('Reserva');
  }

  res.json({
    status: 'success',
    data: formatReservationResponse(reservation),
  });
});

export const createReservation = asyncHandler(async (req, res) => {
  const { clientId, professionalId, serviceId, startTime, timezone: inputTimezone, clientRequestId, phone, name, email } = req.body;

  const business = await getDefaultBusiness();
  if (!business) {
    throw new AppError('Business not found', 404, 'BUSINESS_NOT_FOUND');
  }

  const timezone = inputTimezone || business.timezone || 'America/Argentina/Buenos_Aires';

  // 1. Validar el cliente: por clientId existente o por teléfono (público)
  let client;
  if (clientId) {
    client = await Client.findOne({ _id: clientId, businessId: business._id });
    if (!client) {
      throw new NotFoundError('Cliente');
    }
  } else if (phone) {
    client = await Client.findOne({ phone, businessId: business._id });
    if (!client) {
      client = await Client.create({
        businessId: business._id,
        name: name || '',
        phone,
        email: email || undefined,
      });
    }
  } else {
    throw new AppError('Se requiere clientId o teléfono para identificar al cliente', 400, 'CLIENT_REQUIRED');
  }

  // 2. Validar que el profesional existe, está activo y pertenece al negocio
  const professional = await Professional.findOne({ _id: professionalId, businessId: business._id });
  if (!professional) {
    throw new NotFoundError('Profesional');
  }
  if (!professional.isActive) {
    throw new AppError('Profesional inactivo', 400, 'PROFESSIONAL_INACTIVE');
  }

  // 3. Validar que el servicio existe, está activo y pertenece al negocio
  const service = await Service.findOne({ _id: serviceId, businessId: business._id });
  if (!service) {
    throw new NotFoundError('Servicio');
  }
  if (!service.isActive) {
    throw new AppError('Servicio inactivo', 400, 'SERVICE_INACTIVE');
  }

  // 4. Validar que el profesional pueda realizar el servicio
  if (!professional.services.includes(serviceId)) {
    throw new AppError('El profesional no ofrece este servicio', 400, 'SERVICE_NOT_OFFERED');
  }

  // 5. Comprobación de horarios del profesional en Schedule
  const startDate = new Date(startTime);

  // Calcular día de la semana usando la zona horaria del negocio
  const dateStr = getDateInTimezone(startDate, timezone);
  if (!dateStr) {
    throw new AppError('Error calculando horarios', 400, 'TIMEZONE_CALCULATION_ERROR');
  }
  const [year, month, day] = dateStr.split('-').map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  // Calcular endTime basado en la duración del servicio
  const reservationEndTime = new Date(startTime);
  reservationEndTime.setMinutes(reservationEndTime.getMinutes() + service.durationMinutes);

  const reservationStartMin = getTimeInTimezoneMinutes(startDate, timezone);
  const reservationEndMin = getTimeInTimezoneMinutes(reservationEndTime, timezone);

  if (reservationStartMin === null || reservationEndMin === null) {
    throw new AppError('Error calculando horarios', 400, 'TIMEZONE_CALCULATION_ERROR');
  }

  // Buscar TODOS los intervalos activos del profesional para ese día
  const activeSchedules = await Schedule.find({
    businessId: business._id,
    professionalId: professional._id,
    dayOfWeek,
    isActive: true,
  });

  if (activeSchedules.length === 0) {
    throw new AppError('El profesional no tiene horario de trabajo definido para este día', 400, 'NO_SCHEDULE_FOR_DAY');
  }

  // Verificar que el inicio y la duración completa estén dentro de un mismo intervalo
  const fitsInInterval = activeSchedules.some((schedule) => {
    const scheduleStartMin = getTimeInTimezoneMinutes(new Date(schedule.startTime + ':00'), timezone);
    const scheduleEndMin = getTimeInTimezoneMinutes(new Date(schedule.endTime + ':00'), timezone);
    if (scheduleStartMin === null || scheduleEndMin === null) {
      return false;
    }
    return reservationStartMin >= scheduleStartMin && reservationEndMin <= scheduleEndMin;
  });

  if (!fitsInInterval) {
    throw new AppError('El horario de la reserva está fuera del horario laboral del profesional o excede el intervalo disponible', 400, 'OUTSIDE_WORKING_HOURS');
  }

  const endTime = reservationEndTime;

  // 6. Verificar bloqueos en ScheduleBlock (fuera de transacción, solo bloques explícitos)
  const blocks = await ScheduleBlock.find({
    businessId: business._id,
    professionalId: professional._id,
    startTime: { $lt: reservationEndTime },
    endTime: { $gt: startTime },
  });

  if (blocks.length > 0) {
    throw new AppError('El profesional tiene un bloqueo (vacaciones, reunión, etc.) en ese horario', 400, 'SCHEDULE_BLOCKED');
  }

  // 7. Validar que la reserva no sea pasada (usando zona horaria del negocio)
  const now = new Date();
  const nowDate = getDateInTimezone(now, timezone);
  const reservationStartDate = getDateInTimezone(startDate, timezone);

  if (startDate !== null && nowDate !== null && startDate <= nowDate) {
    const nowMin = getTimeInTimezoneMinutes(now, timezone);
    const startMin = getTimeInTimezoneMinutes(reservationStartDate, timezone);
    if (startMin !== null && nowMin !== null && startMin <= nowMin) {
      throw new AppError('No se pueden crear reservas con fecha y hora pasadas', 400, 'PAST_RESERVATION');
    }
  }

  // 8. Crear la reserva usando transacción MongoDB con ProfessionalLock
  const MAX_RETRIES = 3;
  let lastError = null;
  let retryCountTransient = 0;
  let retryCountCommit = 0;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const session = await Reservation.startSession();

    try {
      session.startTransaction();

      // Determine date ranges this reservation spans
      const dateRanges = getDateRangesForReservation(startTime, endTime, timezone);

      // Acquire ProfessionalLocks in deterministical order (sorted by date)
      const sortedDates = [...dateRanges].sort();

      const lockDocs = [];
      for (const date of sortedDates) {
        let lock = await ProfessionalLock.findOneAndUpdate(
          { businessId: business._id, professionalId: professional._id, date },
          { $setOnInsert: { businessId: business._id, professionalId: professional._id, date }, $inc: { version: 1 } },
          { upsert: true, new: true, session }
        );
        lockDocs.push(lock);
      }

      // Check for overlapping reservations within the transaction
      const existingOverlap = await Reservation.findOne({
        businessId: business._id,
        professionalId: professional._id,
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
        status: { $in: getActiveStatusesThatBlock() },
      }).session(session);

      if (existingOverlap) {
        await session.abortTransaction();
        session.endSession();
        throw new AppError('El profesional ya tiene una reserva activa en ese horario', 400, 'RESERVATION_CONFLICT');
      }

      // Also check PENDING reservations that are not expired
      const pendingOverlap = await Reservation.findOne({
        businessId: business._id,
        professionalId: professional._id,
        startTime: { $lt: endTime },
        endTime: { $gt: startTime },
        status: 'PENDING',
        expiresAt: { $gt: new Date() },
      }).session(session);

      if (pendingOverlap) {
        await session.abortTransaction();
        session.endSession();
        throw new AppError('El profesional ya tiene una reserva PENDIENTE vigente en ese horario', 400, 'RESERVATION_PENDING_CONFLICT');
      }

      // Determine reservation status
      const reservationStatus = service.requiresDeposit ? 'PENDING' : 'CONFIRMED';

      // Create the reservation with values from the model (not from frontend)
      const reservation = await Reservation.create({
        businessId: business._id,
        clientId: client._id,
        professionalId,
        serviceId,
        status: reservationStatus,
        startTime,
        endTime: reservationEndTime,
        timezone,
        price: service.price,
        currency: service.currency,
        requiresDeposit: service.requiresDeposit,
        depositAmount: service.depositAmount,
        depositType: service.depositType,
        notes: req.body.notes || '',
        clientRequestId: clientRequestId || undefined,
      }, { session });

      await session.commitTransaction();
      session.endSession();

      res.status(201).json({
        status: 'success',
        data: {
          reservation: formatReservationResponse(reservation),
        },
      });
      return;
    } catch (err) {
      // 1. Clasificar el error usando hasErrorLabel
      const isTransient = err instanceof Error && err.hasErrorLabel && err.hasErrorLabel('TransientTransactionError');
      const isCommitUnknown = err instanceof Error && err.hasErrorLabel && err.hasErrorLabel('UnknownTransactionCommitResult');
      const isE11000 = err instanceof Error && err.code === 11000;

      // Función helper para cerrar sesión de forma segura
      const closeSession = async (s, abortTxn = true) => {
        if (!s) return;
        try {
          if (abortTxn && s.inTransaction()) {
            await s.abortTransaction();
          }
        } catch (e) {
          // Ignore abort errors
        }
        try {
          await s.endSession();
        } catch (e) {
          // Ignore
        }
      };

      // 2. Manejo de E11000: diagnosticar con keyPattern y keyValue
      if (isE11000) {
        const keyPattern = err.keyPattern || {};
        const keyValue = err.keyValue || {};

        // Si el duplicidad es en clientRequestId, es un reenvío idempotente:
        // devolver la reserva existente en lugar de crear una duplicada.
        if (keyPattern.clientRequestId) {
          await closeSession(session, true);
          const existing = await Reservation.findOne({
            businessId: business._id,
            clientRequestId: keyValue.clientRequestId,
          });
          if (existing) {
            res.status(201).json({
              status: 'success',
              data: {
                reservation: formatReservationResponse(existing),
              },
            });
            return;
          }
        }

        // Para otros índices únicos (ej. ProfessionalLock upsert race),
        // cerrar sesión y reintentar operación completa.
        await closeSession(session, true);
        lastError = err;
        continue;
      }

      // 3. Preparar sesión: abortar y finalizar salvo UnknownTransactionCommitResult
      if (!isCommitUnknown) {
        await closeSession(session, true);
      }

      // 4. Manejo de TransientTransactionError: nueva sesión, repetición completa
      if (isTransient) {
        retryCountTransient++;
        if (retryCountTransient >= MAX_RETRIES) {
          throw new AppError('Error transitorio persistente en la transacción', 500, 'TRANSIENT_TRANSACTION_ERROR');
        }
        lastError = err;
        continue;
      }

      // 5. Manejo de UnknownTransactionCommitResult: reintentar commit() sobre misma sesión
      if (isCommitUnknown) {
        retryCountCommit++;
        if (retryCountCommit >= MAX_RETRIES) {
          try {
            if (session && session.inTransaction()) {
              await session.abortTransaction();
            }
          } catch (e) {
            // Ignore
          }
          try {
            session.endSession();
          } catch (e) {
            // Ignore
          }
          throw new AppError('No se pudo confirmar el resultado de la transacción después de varios intentos', 500, 'UNKNOWN_TRANSACTION_COMMIT_RESULT');
        }
        try {
          await session.commitTransaction();
          session.endSession();
          res.status(201).json({
            status: 'success',
            data: {
              reservation: formatReservationResponse(reservation),
            },
          });
          return;
        } catch (commitErr) {
          lastError = commitErr;
          continue;
        }
      }

      // 6. Error genérico: ya se cerró sesión arriba, reintentar
      lastError = err;
      continue;
    }
  }

  throw lastError || new AppError('No se pudo crear la reserva después de varios intentos', 500, 'TRANSACTION_FAILED');
});