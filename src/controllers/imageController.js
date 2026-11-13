import { asyncHandler } from '../middleware/errorHandler.js';
import { ConflictError } from '../utils/AppError.js';
import { safeUpload, uploadBuffer, streamImage, deleteImage, isImageReferenced } from '../services/imageService.js';
import { imageUrlFor } from '../utils/imageUrl.js';

export const uploadImage = asyncHandler(async (req, res) => {
  const { buffer, contentType } = safeUpload(req);

  const imageId = await uploadBuffer({
    buffer,
    contentType,
    metadata: {
      businessId: req.user?.businessId ? String(req.user.businessId) : null,
      uploadedBy: req.user?.id ? String(req.user.id) : null,
    },
  });

  res.status(201).json({
    status: 'success',
    message: 'Imagen subida exitosamente',
    data: {
      id: imageId,
      url: imageUrlFor(imageId),
      contentType,
      size: buffer.length,
    },
  });
});

export const serveImage = asyncHandler(async (req, res) => {
  await streamImage(req.params.id, res);
});

export const removeImage = asyncHandler(async (req, res) => {
  const referenced = await isImageReferenced(req.params.id);
  if (referenced) {
    throw new ConflictError('La imagen está en uso y no puede eliminarse');
  }

  await deleteImage(req.params.id);

  res.json({
    status: 'success',
    message: 'Imagen eliminada exitosamente',
  });
});
