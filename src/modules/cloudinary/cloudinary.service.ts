import { Injectable } from '@nestjs/common';
import { UploadApiErrorResponse, UploadApiResponse, v2 } from 'cloudinary';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import toStream = require('buffer-to-stream');

@Injectable()
export class CloudinaryService {
  private configure(): void {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
    const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
    const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET',
      );
    }
    v2.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  }

  async uploadImage(
    file: any,
    folder: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    this.configure();
    if (!file?.buffer?.length) throw new Error('The uploaded image is empty');

    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        {
          folder,
          // `auto` supports JPEG/PNG as well as HEIC images produced by iOS.
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(new Error(error.message));
          }
          resolve(result);
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      toStream(file.buffer).pipe(upload);
    });
  }

  async uploadAudio(
    file: any,
    folder: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    this.configure();

    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'video', // Audio files are treated as video in Cloudinary
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary audio upload error:', error);
            return reject(new Error(error.message));
          }
          resolve(result);
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      toStream(file.buffer).pipe(upload);
    });
  }

  async uploadImageFromBase64(
    base64String: string,
    folder: string,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    this.configure();

    // Remove data URI prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64String.includes(',')
      ? base64String.split(',')[1]
      : base64String;

    // Convert base64 to buffer
    const buffer = Buffer.from(base64Data, 'base64');

    return new Promise((resolve, reject) => {
      const upload = v2.uploader.upload_stream(
        {
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(new Error(error.message));
          }
          resolve(result);
        },
      );

      toStream(buffer).pipe(upload);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    this.configure();
    await v2.uploader.destroy(publicId);
  }

  async deleteByUrl(url: string): Promise<void> {
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
    if (!match?.[1]) return;
    await this.deleteImage(decodeURIComponent(match[1]));
  }
}
