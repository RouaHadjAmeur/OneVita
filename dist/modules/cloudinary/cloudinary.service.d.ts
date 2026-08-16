import { UploadApiErrorResponse, UploadApiResponse } from 'cloudinary';
export declare class CloudinaryService {
    private configure;
    uploadImage(file: any, folder: string): Promise<UploadApiResponse | UploadApiErrorResponse>;
    uploadAudio(file: any, folder: string): Promise<UploadApiResponse | UploadApiErrorResponse>;
    uploadImageFromBase64(base64String: string, folder: string): Promise<UploadApiResponse | UploadApiErrorResponse>;
    deleteImage(publicId: string): Promise<void>;
    deleteByUrl(url: string): Promise<void>;
}
