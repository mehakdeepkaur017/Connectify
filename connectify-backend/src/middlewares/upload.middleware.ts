import multer from 'multer';
import { Request } from 'express';
import { AppError } from '../utils/AppError';

// Configure storage to use memory
const storage = multer.memoryStorage();

// File filter for images
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError('Invalid file type! Please upload only JPG, JPEG, PNG, WEBP, MP4, MOV, or WEBM files.', 400));
  }
};

// Multer configuration
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB max per file to allow videos
    files: 10, // Max 10 files
  },
  fileFilter: fileFilter,
});
