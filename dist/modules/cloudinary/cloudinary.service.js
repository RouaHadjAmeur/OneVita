"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudinaryService = void 0;
const common_1 = require("@nestjs/common");
const cloudinary_1 = require("cloudinary");
const toStream = require("buffer-to-stream");
let CloudinaryService = class CloudinaryService {
    configure() {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
        const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
        const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
        if (!cloudName || !apiKey || !apiSecret) {
            throw new Error('Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET');
        }
        cloudinary_1.v2.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
    }
    async uploadImage(file, folder) {
        this.configure();
        if (!file?.buffer?.length)
            throw new Error('The uploaded image is empty');
        return new Promise((resolve, reject) => {
            const upload = cloudinary_1.v2.uploader.upload_stream({
                folder,
                resource_type: 'auto',
            }, (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return reject(new Error(error.message));
                }
                resolve(result);
            });
            toStream(file.buffer).pipe(upload);
        });
    }
    async uploadAudio(file, folder) {
        this.configure();
        return new Promise((resolve, reject) => {
            const upload = cloudinary_1.v2.uploader.upload_stream({
                folder: folder,
                resource_type: 'video',
            }, (error, result) => {
                if (error) {
                    console.error('Cloudinary audio upload error:', error);
                    return reject(new Error(error.message));
                }
                resolve(result);
            });
            toStream(file.buffer).pipe(upload);
        });
    }
    async uploadImageFromBase64(base64String, folder) {
        this.configure();
        const base64Data = base64String.includes(',')
            ? base64String.split(',')[1]
            : base64String;
        const buffer = Buffer.from(base64Data, 'base64');
        return new Promise((resolve, reject) => {
            const upload = cloudinary_1.v2.uploader.upload_stream({
                resource_type: 'image',
            }, (error, result) => {
                if (error) {
                    console.error('Cloudinary upload error:', error);
                    return reject(new Error(error.message));
                }
                resolve(result);
            });
            toStream(buffer).pipe(upload);
        });
    }
    async deleteImage(publicId) {
        this.configure();
        await cloudinary_1.v2.uploader.destroy(publicId);
    }
    async deleteByUrl(url) {
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[a-zA-Z0-9]+)?$/);
        if (!match?.[1])
            return;
        await this.deleteImage(decodeURIComponent(match[1]));
    }
};
exports.CloudinaryService = CloudinaryService;
exports.CloudinaryService = CloudinaryService = __decorate([
    (0, common_1.Injectable)()
], CloudinaryService);
//# sourceMappingURL=cloudinary.service.js.map