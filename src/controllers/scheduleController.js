import { Schedule, Professional, Business } from '../models/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { NotFoundError, AppError, ConflictError, ForbiddenError, ValidationError } from '../utils/AppError.js';

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

const timeToMinutes = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const intervalsOverlap = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};

const formatScheduleResponse = (schedule) => ({
  id: schedule._id,
  businessId: schedule.businessId,
  professionalId: schedule.professionalId,
  dayOfWeek: schedule.dayOfWeek,
  startTime: schedule.startTime,
  endTime: schedule.endTime,
  isActive: schedule.isActive,
  createdAt: schedule.createdAt,
  updatedAt: schedule.updatedAt,
});

export const listSchedules = asyncHandler(async (req, res) => {
  const { professionalId, businessId, dayOfWeek, isActive, page = 1, limit = 20 } = req.query;
  const skip = (page - 1) * limit;

  const business = await getDefaultBusiness();
  const filter = { businessId: business._id };

  if (professionalId) filter.professionalId = professionalId;
  if (dayOfWeek !== undefined) filter.dayOfWeek = parseInt(dayOfWeek, 10);
  if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;

  const [schedules, total] = await Promise.all([
    Schedule.find(filter)
      .sort({ dayOfWeek: 1, startTime: 1 })
      .skip(skip)
      .limit(limit),
    Schedule.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    data: {
      schedules: schedules.map(formatScheduleResponse),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
});

export const getSchedulesByProfessional = asyncHandler(async (req, res) => {
  const { professionalId } = req.params;
  const { isActive } = req.query;

  const business = await getDefaultBusiness();

  const professional = await Professional.findOne({ _id: professionalId, businessId: business._id });
  if (!professional) {
    throw new NotFoundError('Profesional');
  }

  const filter = { businessId: business._id, professionalId };
  if (isActive !== undefined) filter.isActive = isActive === 'true' || isActive === true;

  const schedules = await Schedule.find(filter).sort({ dayOfWeek: 1, startTime: 1 });

  res.json({
    status: 'success',
    data: {
      professionalId,
      schedules: schedules.map(formatScheduleResponse),
    },
  });
});

export const createSchedule = asyncHandler(async (req, res) => {
  const { businessId, professionalId, dayOfWeek, startTime, endTime, isActive = true } = req.body;

  const business = await getDefaultBusiness();
  if (String(businessId) !== String(business._id)) {
    throw new ForbiddenError('El businessId no coincide con el negocio actual');
  }

  const professional = await Professional.findOne({ _id: professionalId, businessId: business._id });
  if (!professional) {
    throw new NotFoundError('Profesional');
  }

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);

  if (startMin >= endMin) {
    throw new ValidationError('La hora de finalización debe ser posterior a la de inicio');
  }

  const existingIntervals = await Schedule.find({
    businessId: business._id,
    professionalId,
    dayOfWeek,
    isActive: true,
  });

  for (const existing of existingIntervals) {
    const existingStart = timeToMinutes(existing.startTime);
    const existingEnd = timeToMinutes(existing.endTime);
    if (intervalsOverlap(startMin, endMin, existingStart, existingEnd)) {
      throw new ConflictError(
        `El intervalo ${startTime}-${endTime} se superpone con un horario existente ${existing.startTime}-${existing.endTime}`
      );
    }
  }

  const schedule = await Schedule.create({
    businessId: business._id,
    professionalId,
    dayOfWeek,
    startTime,
    endTime,
    isActive,
  });

  res.status(201).json({
    status: 'success',
    message: 'Horario laboral creado exitosamente',
    data: formatScheduleResponse(schedule),
  });
});

export const updateSchedule = asyncHandler(async (req, res) => {
  const { dayOfWeek, startTime, endTime, isActive } = req.body;

  const business = await getDefaultBusiness();
  const schedule = await Schedule.findOne({ _id: req.params.id, businessId: business._id });
  if (!schedule) {
    throw new NotFoundError('Horario');
  }

  const professional = await Professional.findOne({ _id: schedule.professionalId, businessId: business._id });
  if (!professional) {
    throw new NotFoundError('Profesional');
  }

  const newDayOfWeek = dayOfWeek !== undefined ? dayOfWeek : schedule.dayOfWeek;
  const newStartTime = startTime !== undefined ? startTime : schedule.startTime;
  const newEndTime = endTime !== undefined ? endTime : schedule.endTime;

  const startMin = timeToMinutes(newStartTime);
  const endMin = timeToMinutes(newEndTime);

  if (startMin >= endMin) {
    throw new ValidationError('La hora de finalización debe ser posterior a la de inicio');
  }

  const existingIntervals = await Schedule.find({
    businessId: business._id,
    professionalId: schedule.professionalId,
    dayOfWeek: newDayOfWeek,
    isActive: true,
    _id: { $ne: schedule._id },
  });

  for (const existing of existingIntervals) {
    const existingStart = timeToMinutes(existing.startTime);
    const existingEnd = timeToMinutes(existing.endTime);
    if (intervalsOverlap(startMin, endMin, existingStart, existingEnd)) {
      throw new ConflictError(
        `El intervalo ${newStartTime}-${newEndTime} se superpone con un horario existente ${existing.startTime}-${existing.endTime}`
      );
    }
  }

  if (dayOfWeek !== undefined) schedule.dayOfWeek = dayOfWeek;
  if (startTime !== undefined) schedule.startTime = startTime;
  if (endTime !== undefined) schedule.endTime = endTime;
  if (isActive !== undefined) schedule.isActive = isActive;

  await schedule.save();

  res.json({
    status: 'success',
    message: 'Horario laboral actualizado exitosamente',
    data: formatScheduleResponse(schedule),
  });
});

export const deleteSchedule = asyncHandler(async (req, res) => {
  const business = await getDefaultBusiness();
  const schedule = await Schedule.findOne({ _id: req.params.id, businessId: business._id });
  if (!schedule) {
    throw new NotFoundError('Horario');
  }

  await Schedule.deleteOne({ _id: schedule._id });

  res.json({
    status: 'success',
    message: 'Horario laboral eliminado exitosamente',
  });
});
