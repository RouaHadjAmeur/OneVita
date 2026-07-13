"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VeterinariansService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const users_service_1 = require("../users/users.service");
const user_schema_1 = require("../users/schemas/user.schema");
const veterinarian_schema_1 = require("./schemas/veterinarian.schema");
const mail_service_1 = require("../mail/mail.service");
const cloudinary_service_1 = require("../cloudinary/cloudinary.service");
const bcrypt = __importStar(require("bcrypt"));
let VeterinariansService = class VeterinariansService {
    constructor(userModel, veterinarianModel, usersService, mailService, cloudinaryService) {
        this.userModel = userModel;
        this.veterinarianModel = veterinarianModel;
        this.usersService = usersService;
        this.mailService = mailService;
        this.cloudinaryService = cloudinaryService;
    }
    async resolveVetImages(vetData) {
        const result = {};
        if (vetData.licenseImageBase64) {
            const uploaded = await this.cloudinaryService.uploadImageFromBase64(vetData.licenseImageBase64, 'veterinarians/licenses');
            result.licenseImageUrl = uploaded.secure_url;
        }
        if (vetData.clinicImageBase64) {
            const uploaded = await this.cloudinaryService.uploadImageFromBase64(vetData.clinicImageBase64, 'veterinarians/clinics');
            result.clinicImageUrl = uploaded.secure_url;
        }
        return result;
    }
    async create(createVetDto) {
        const existingUser = await this.usersService.findByEmail(createVetDto.email);
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(createVetDto.password, 10);
        const vetData = {
            ...createVetDto,
            password: hashedPassword,
            role: 'vet',
            isVerified: false,
            balance: 0,
        };
        const createdUser = await new this.userModel(vetData).save();
        const uploadedImages = await this.resolveVetImages(createVetDto);
        const veterinarian = new this.veterinarianModel({
            user: createdUser._id,
            licenseNumber: createVetDto.licenseNumber,
            clinicName: createVetDto.clinicName,
            clinicAddress: createVetDto.clinicAddress,
            specializations: createVetDto.specializations || [],
            yearsOfExperience: createVetDto.yearsOfExperience,
            latitude: createVetDto.latitude,
            longitude: createVetDto.longitude,
            bio: createVetDto.bio,
            licenseImageUrl: uploadedImages.licenseImageUrl,
            clinicImageUrl: uploadedImages.clinicImageUrl,
        });
        await veterinarian.save();
        return createdUser;
    }
    async findAll(excludeUserId) {
        const filter = excludeUserId && mongoose_2.Types.ObjectId.isValid(excludeUserId)
            ? { user: { $ne: new mongoose_2.Types.ObjectId(excludeUserId) } }
            : {};
        const veterinarians = await this.veterinarianModel
            .find(filter)
            .populate('user')
            .exec();
        return veterinarians.map((vet) => {
            const user = vet.user;
            if (!user || !('_id' in user)) {
                throw new common_1.NotFoundException('User not populated correctly');
            }
            if (vet.latitude !== undefined) {
                user.latitude = vet.latitude;
            }
            if (vet.longitude !== undefined) {
                user.longitude = vet.longitude;
            }
            return user;
        });
    }
    async findOne(id) {
        const vet = await this.veterinarianModel
            .findOne({ user: id })
            .populate('user')
            .exec();
        if (!vet) {
            throw new common_1.NotFoundException(`Veterinarian with ID ${id} not found`);
        }
        const user = vet.user;
        if (!user || !('_id' in user)) {
            throw new common_1.NotFoundException('User not populated correctly');
        }
        user.vetLicenseNumber = vet.licenseNumber;
        user.vetClinicName = vet.clinicName;
        user.vetAddress = vet.clinicAddress;
        user.vetSpecializations = vet.specializations;
        user.vetYearsOfExperience = vet.yearsOfExperience;
        user.vetBio = vet.bio;
        user.vetLicenseImageUrl = vet.licenseImageUrl;
        user.vetClinicImageUrl = vet.clinicImageUrl;
        user.latitude = vet.latitude;
        user.longitude = vet.longitude;
        return user;
    }
    async findByEmail(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user || user.role !== 'vet') {
            return null;
        }
        const vet = await this.veterinarianModel
            .findOne({ user: user._id })
            .populate('user')
            .exec();
        if (!vet) {
            return null;
        }
        const populatedUser = vet.user;
        return populatedUser && '_id' in populatedUser ? populatedUser : null;
    }
    async update(id, updateVetDto) {
        const userFields = {};
        const vetFields = {};
        if (updateVetDto.phoneNumber !== undefined) {
            userFields.phone = updateVetDto.phoneNumber;
        }
        if (updateVetDto.name !== undefined) {
            userFields.name = updateVetDto.name;
        }
        if (updateVetDto.email !== undefined) {
            userFields.email = updateVetDto.email;
        }
        if (updateVetDto.licenseNumber !== undefined) {
            vetFields.licenseNumber = updateVetDto.licenseNumber;
        }
        if (updateVetDto.clinicName !== undefined) {
            vetFields.clinicName = updateVetDto.clinicName;
        }
        if (updateVetDto.clinicAddress !== undefined) {
            vetFields.clinicAddress = updateVetDto.clinicAddress;
        }
        if (updateVetDto.specializations !== undefined) {
            vetFields.specializations = updateVetDto.specializations;
        }
        if (updateVetDto.yearsOfExperience !== undefined) {
            vetFields.yearsOfExperience = updateVetDto.yearsOfExperience;
        }
        if (updateVetDto.latitude !== undefined) {
            vetFields.latitude = updateVetDto.latitude;
        }
        if (updateVetDto.longitude !== undefined) {
            vetFields.longitude = updateVetDto.longitude;
        }
        if (updateVetDto.bio !== undefined) {
            vetFields.bio = updateVetDto.bio;
        }
        const uploadedImages = await this.resolveVetImages(updateVetDto);
        if (uploadedImages.licenseImageUrl !== undefined) {
            vetFields.licenseImageUrl = uploadedImages.licenseImageUrl;
        }
        if (uploadedImages.clinicImageUrl !== undefined) {
            vetFields.clinicImageUrl = uploadedImages.clinicImageUrl;
        }
        if (Object.keys(userFields).length > 0) {
            await this.userModel.findByIdAndUpdate(id, { $set: userFields }).exec();
        }
        const vet = await this.veterinarianModel
            .findOneAndUpdate({ user: id }, { $set: vetFields }, { new: true })
            .populate('user')
            .exec();
        if (!vet) {
            throw new common_1.NotFoundException(`Veterinarian with ID ${id} not found`);
        }
        const user = vet.user;
        if (!user || !('_id' in user)) {
            throw new common_1.NotFoundException('User not populated correctly');
        }
        user.vetLicenseNumber = vet.licenseNumber;
        user.vetClinicName = vet.clinicName;
        user.vetAddress = vet.clinicAddress;
        user.vetSpecializations = vet.specializations;
        user.vetYearsOfExperience = vet.yearsOfExperience;
        user.vetBio = vet.bio;
        user.vetLicenseImageUrl = vet.licenseImageUrl;
        user.vetClinicImageUrl = vet.clinicImageUrl;
        user.latitude = vet.latitude;
        user.longitude = vet.longitude;
        return user;
    }
    async remove(id) {
        const result = await this.veterinarianModel
            .findOneAndDelete({ user: id })
            .exec();
        if (!result) {
            throw new common_1.NotFoundException(`Veterinarian with ID ${id} not found`);
        }
        await this.userModel
            .findByIdAndUpdate(id, { $set: { role: 'owner' } })
            .exec();
    }
    async convertUserToVet(userId, vetData) {
        const user = await this.usersService.findOne(userId);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        let veterinarian = await this.veterinarianModel
            .findOne({ user: userId })
            .exec();
        const uploadedImages = await this.resolveVetImages(vetData);
        const licenseImageUrl = uploadedImages.licenseImageUrl ?? veterinarian?.licenseImageUrl;
        const clinicImageUrl = uploadedImages.clinicImageUrl ?? veterinarian?.clinicImageUrl;
        if (veterinarian) {
            veterinarian = await this.veterinarianModel
                .findOneAndUpdate({ user: userId }, {
                $set: {
                    licenseNumber: vetData.licenseNumber,
                    clinicName: vetData.clinicName,
                    clinicAddress: vetData.clinicAddress,
                    specializations: vetData.specializations || [],
                    yearsOfExperience: vetData.yearsOfExperience,
                    latitude: vetData.latitude,
                    longitude: vetData.longitude,
                    bio: vetData.bio,
                    licenseImageUrl,
                    clinicImageUrl,
                },
            }, { new: true })
                .populate('user')
                .exec();
        }
        else {
            const vetRecordData = {
                user: userId,
                licenseNumber: vetData.licenseNumber,
                clinicName: vetData.clinicName,
                clinicAddress: vetData.clinicAddress,
                specializations: vetData.specializations || [],
                yearsOfExperience: vetData.yearsOfExperience,
                latitude: vetData.latitude,
                longitude: vetData.longitude,
                bio: vetData.bio,
                licenseImageUrl,
                clinicImageUrl,
            };
            delete vetRecordData.email;
            const vetRecord = new this.veterinarianModel(vetRecordData);
            veterinarian = await vetRecord.save();
            await veterinarian.populate('user');
            await this.userModel
                .findByIdAndUpdate(userId, {
                $set: {
                    role: 'vet',
                },
            })
                .exec();
            console.log(`[Vet Conversion] User ${userId} converted to vet role`);
        }
        const updatedUser = await this.usersService.findOne(userId);
        return updatedUser;
    }
};
exports.VeterinariansService = VeterinariansService;
exports.VeterinariansService = VeterinariansService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(veterinarian_schema_1.Veterinarian.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        mail_service_1.MailService,
        cloudinary_service_1.CloudinaryService])
], VeterinariansService);
//# sourceMappingURL=veterinarians.service.js.map