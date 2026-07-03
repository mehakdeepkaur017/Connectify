import { v2 as cloudinary } from 'cloudinary';
import { env } from './env';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string = 'connectify'
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'auto',
      },
      (error, result) => {
        if (error) return reject(error);
        if (result) {
          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        } else {
          reject(new Error('Cloudinary upload failed: no result returned'));
        }
      }
    );

    const stream = Readable.from(buffer);
    stream.pipe(uploadStream);
  });
};

export default cloudinary;
