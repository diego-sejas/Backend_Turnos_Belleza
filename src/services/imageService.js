import mongoose from 'mongoose';
import { Readable } from 'stream';
import { ValidationError, NotFoundError } from '../utils/AppError.js';

const BUCKET_NAME = 'images';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const getBucket = () => new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
  bucketName: BUCKET_NAME,
});

const detectImageType = (buffer) => {
  if (!buffer || buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
    buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
};

export const safeUpload = (req) => {
  const buffer = req.body;
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new ValidationError('No se recibió ninguna imagen');
  }
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new ValidationError(`La imagen supera el límite de ${MAX_IMAGE_BYTES / (1024 * 1024)} MB`);
  }

  const detected = detectImageType(buffer);
  if (!detected) {
    throw new ValidationError('Formato de imagen no permitido. Se aceptan JPEG, PNG o WebP');
  }
  if (!ALLOWED_TYPES.includes(detected)) {
    throw new ValidationError('Formato de imagen no permitido. Se aceptan JPEG, PNG o WebP');
  }

  return { buffer, contentType: detected };
};

export const uploadBuffer = ({ buffer, contentType, metadata = {} }) => new Promise((resolve, reject) => {
  const bucket = getBucket();
  const uploadStream = bucket.openUploadStream(`img-${Date.now()}-${new mongoose.Types.ObjectId()}`, {
    contentType,
    metadata: {
      ...metadata,
      contentType,
      size: buffer.length,
      uploadedAt: new Date(),
    },
  });

  uploadStream.on('error', reject);
  uploadStream.on('finish', () => resolve(uploadStream.id));

  Readable.from(buffer).pipe(uploadStream);
});

export const getImageInfo = async (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('ID de imagen inválido');
  }

  const bucket = getBucket();
  const files = await bucket.find({ _id: new mongoose.Types.ObjectId(id) }).limit(1).toArray();
  return files[0] || null;
};

export const streamImage = async (id, res) => {
  const file = await getImageInfo(id);
  if (!file) {
    throw new NotFoundError('Imagen');
  }

  res.set('Content-Type', file.contentType || 'application/octet-stream');
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  if (file.length) {
    res.set('Content-Length', String(file.length));
  }

  const bucket = getBucket();
  const downloadStream = bucket.openDownloadStream(file._id);

  return new Promise((resolve, reject) => {
    downloadStream.on('error', reject);
    downloadStream.on('end', resolve);
    downloadStream.pipe(res);
  });
};

export const deleteImage = async (id) => {
  const file = await getImageInfo(id);
  if (!file) {
    throw new NotFoundError('Imagen');
  }

  const bucket = getBucket();
  await bucket.delete(file._id);
  return file._id;
};

export const isImageReferenced = async (imageId) => {
  if (!imageId) return false;

  const { Service, Professional, Work } = await import('../models/index.js');
  const id = imageId instanceof mongoose.Types.ObjectId
    ? imageId
    : new mongoose.Types.ObjectId(imageId);

  const [serviceRef, professionalRef, workRef] = await Promise.all([
    Service.exists({ imageId: id }),
    Professional.exists({ imageId: id }),
    Work.exists({ imageIds: id }),
  ]);

  return Boolean(serviceRef || professionalRef || workRef);
};

export const deleteIfOrphaned = async (imageId) => {
  if (!imageId) return false;

  const referenced = await isImageReferenced(imageId);
  if (referenced) return false;

  try {
    await deleteImage(imageId);
    return true;
  } catch {
    return false;
  }
};

