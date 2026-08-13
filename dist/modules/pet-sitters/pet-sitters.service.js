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
exports.PetSittersService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const users_service_1 = require("../users/users.service");
const user_schema_1 = require("../users/schemas/user.schema");
const pet_sitter_schema_1 = require("./schemas/pet-sitter.schema");
const mail_service_1 = require("../mail/mail.service");
const bcrypt = __importStar(require("bcrypt"));
let PetSittersService = class PetSittersService {
    constructor(userModel, petSitterModel, usersService, mailService) {
        this.userModel = userModel;
        this.petSitterModel = petSitterModel;
        this.usersService = usersService;
        this.mailService = mailService;
    }
    async create(createSitterDto) {
        const existingUser = await this.usersService.findByEmail(createSitterDto.email);
        if (existingUser) {
            throw new common_1.ConflictException('User with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(createSitterDto.password, 10);
        const sitterData = {
            ...createSitterDto,
            password: hashedPassword,
            role: 'sitter',
            isVerified: false,
            balance: 0,
        };
        const createdUser = await new this.userModel(sitterData).save();
        let availabilityDates;
        if (createSitterDto.availability &&
            Array.isArray(createSitterDto.availability)) {
            availabilityDates = createSitterDto.availability.map((date) => {
                if (typeof date === 'string') {
                    return new Date(date);
                }
                return date instanceof Date ? date : new Date(date);
            });
        }
        const petSitter = new this.petSitterModel({
            user: createdUser._id,
            hourlyRate: createSitterDto.hourlyRate,
            sitterAddress: createSitterDto.sitterAddress,
            services: createSitterDto.services || [],
            yearsOfExperience: createSitterDto.yearsOfExperience,
            availableWeekends: createSitterDto.availableWeekends ?? false,
            canHostPets: createSitterDto.canHostPets ?? false,
            availability: availabilityDates || [],
            latitude: createSitterDto.latitude,
            longitude: createSitterDto.longitude,
            bio: createSitterDto.bio,
            workdayStartHour: createSitterDto.workdayStartHour ?? 8,
            workdayEndHour: createSitterDto.workdayEndHour ?? 18,
        });
        await petSitter.save();
        return createdUser;
    }
    async findAll(excludeUserId, latitude, longitude) {
        const filter = excludeUserId && mongoose_2.Types.ObjectId.isValid(excludeUserId)
            ? { user: { $ne: new mongoose_2.Types.ObjectId(excludeUserId) } }
            : {};
        const sitters = await this.petSitterModel
            .find(filter)
            .populate('user')
            .exec();
        const result = sitters.map((sitter) => {
            const user = sitter.user;
            if (!user || !('_id' in user)) {
                throw new common_1.NotFoundException('User not populated correctly');
            }
            if (sitter.latitude !== undefined) {
                user.latitude = sitter.latitude;
            }
            if (sitter.longitude !== undefined) {
                user.longitude = sitter.longitude;
            }
            user.sitterAddress = sitter.sitterAddress;
            user.hourlyRate = sitter.hourlyRate;
            user.services = sitter.services;
            user.yearsOfExperience = sitter.yearsOfExperience;
            user.availableWeekends = sitter.availableWeekends;
            user.canHostPets = sitter.canHostPets;
            user.availability = sitter.availability;
            user.bio = sitter.bio;
            user.workdayStartHour = sitter.workdayStartHour;
            user.workdayEndHour = sitter.workdayEndHour;
            if (Number.isFinite(latitude) &&
                Number.isFinite(longitude) &&
                sitter.latitude != null &&
                sitter.longitude != null) {
                user.distanceKm = this.distanceKm(latitude, longitude, sitter.latitude, sitter.longitude);
            }
            return user;
        });
        return result.sort((a, b) => (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE));
    }
    distanceKm(lat1, lon1, lat2, lon2) {
        const radians = (value) => (value * Math.PI) / 180;
        const dLat = radians(lat2 - lat1);
        const dLon = radians(lon2 - lon1);
        const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(radians(lat1)) *
                Math.cos(radians(lat2)) *
                Math.sin(dLon / 2) ** 2;
        return Number((6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1));
    }
    async findOne(id) {
        const sitter = await this.petSitterModel
            .findOne({ user: id })
            .populate('user')
            .exec();
        if (!sitter) {
            throw new common_1.NotFoundException(`Pet sitter with ID ${id} not found`);
        }
        const user = sitter.user;
        if (!user || !('_id' in user)) {
            throw new common_1.NotFoundException('User not populated correctly');
        }
        user.sitterAddress = sitter.sitterAddress;
        user.hourlyRate = sitter.hourlyRate;
        user.services = sitter.services;
        user.yearsOfExperience = sitter.yearsOfExperience;
        user.availableWeekends = sitter.availableWeekends;
        user.canHostPets = sitter.canHostPets;
        user.availability = sitter.availability;
        user.bio = sitter.bio;
        user.workdayStartHour = sitter.workdayStartHour;
        user.workdayEndHour = sitter.workdayEndHour;
        user.latitude = sitter.latitude;
        user.longitude = sitter.longitude;
        return user;
    }
    async findByEmail(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user || user.role !== 'sitter') {
            return null;
        }
        const sitter = await this.petSitterModel
            .findOne({ user: user._id })
            .populate('user')
            .exec();
        if (!sitter) {
            return null;
        }
        const populatedUser = sitter.user;
        return populatedUser && '_id' in populatedUser ? populatedUser : null;
    }
    async update(id, updateSitterDto) {
        const userFields = {};
        const sitterFields = {};
        if (updateSitterDto.phoneNumber !== undefined) {
            userFields.phone = updateSitterDto.phoneNumber;
        }
        if (updateSitterDto.name !== undefined) {
            userFields.name = updateSitterDto.name;
        }
        if (updateSitterDto.email !== undefined) {
            userFields.email = updateSitterDto.email;
        }
        if (updateSitterDto.hourlyRate !== undefined) {
            sitterFields.hourlyRate = updateSitterDto.hourlyRate;
        }
        if (updateSitterDto.sitterAddress !== undefined) {
            sitterFields.sitterAddress = updateSitterDto.sitterAddress;
        }
        if (updateSitterDto.services !== undefined) {
            sitterFields.services = updateSitterDto.services;
        }
        if (updateSitterDto.yearsOfExperience !== undefined) {
            sitterFields.yearsOfExperience = updateSitterDto.yearsOfExperience;
        }
        if (updateSitterDto.availableWeekends !== undefined) {
            sitterFields.availableWeekends = updateSitterDto.availableWeekends;
        }
        if (updateSitterDto.canHostPets !== undefined) {
            sitterFields.canHostPets = updateSitterDto.canHostPets;
        }
        if (updateSitterDto.latitude !== undefined) {
            sitterFields.latitude = updateSitterDto.latitude;
        }
        if (updateSitterDto.longitude !== undefined) {
            sitterFields.longitude = updateSitterDto.longitude;
        }
        if (updateSitterDto.bio !== undefined) {
            sitterFields.bio = updateSitterDto.bio;
        }
        if (updateSitterDto.workdayStartHour !== undefined) {
            sitterFields.workdayStartHour = updateSitterDto.workdayStartHour;
        }
        if (updateSitterDto.workdayEndHour !== undefined) {
            sitterFields.workdayEndHour = updateSitterDto.workdayEndHour;
        }
        if (updateSitterDto.availability &&
            Array.isArray(updateSitterDto.availability)) {
            sitterFields.availability = updateSitterDto.availability.map((date) => {
                if (typeof date === 'string') {
                    return new Date(date);
                }
                return date instanceof Date ? date : new Date(date);
            });
        }
        if (Object.keys(userFields).length > 0) {
            await this.userModel.findByIdAndUpdate(id, { $set: userFields }).exec();
        }
        const sitter = await this.petSitterModel
            .findOneAndUpdate({ user: id }, { $set: sitterFields }, { new: true })
            .populate('user')
            .exec();
        if (!sitter) {
            throw new common_1.NotFoundException(`Pet sitter with ID ${id} not found`);
        }
        const user = sitter.user;
        if (!user || !('_id' in user)) {
            throw new common_1.NotFoundException('User not populated correctly');
        }
        user.sitterAddress = sitter.sitterAddress;
        user.hourlyRate = sitter.hourlyRate;
        user.services = sitter.services;
        user.yearsOfExperience = sitter.yearsOfExperience;
        user.availableWeekends = sitter.availableWeekends;
        user.canHostPets = sitter.canHostPets;
        user.availability = sitter.availability;
        user.bio = sitter.bio;
        user.workdayStartHour = sitter.workdayStartHour;
        user.workdayEndHour = sitter.workdayEndHour;
        user.latitude = sitter.latitude;
        user.longitude = sitter.longitude;
        return user;
    }
    async remove(id) {
        const result = await this.petSitterModel
            .findOneAndDelete({ user: id })
            .exec();
        if (!result) {
            throw new common_1.NotFoundException(`Pet sitter with ID ${id} not found`);
        }
        await this.userModel
            .findByIdAndUpdate(id, { $set: { role: 'owner' } })
            .exec();
    }
    async convertUserToSitter(userId, sitterData) {
        const user = await this.usersService.findOne(userId);
        if (!user) {
            throw new common_1.NotFoundException(`User with ID ${userId} not found`);
        }
        let availabilityDates;
        if (sitterData.availability && Array.isArray(sitterData.availability)) {
            availabilityDates = sitterData.availability.map((date) => {
                if (typeof date === 'string') {
                    return new Date(date);
                }
                return date instanceof Date ? date : new Date(date);
            });
        }
        let petSitter = await this.petSitterModel.findOne({ user: userId }).exec();
        if (petSitter) {
            const updateData = {
                hourlyRate: sitterData.hourlyRate,
                sitterAddress: sitterData.sitterAddress,
                services: sitterData.services,
                yearsOfExperience: sitterData.yearsOfExperience,
                availableWeekends: sitterData.availableWeekends,
                canHostPets: sitterData.canHostPets,
                availability: availabilityDates,
                latitude: sitterData.latitude,
                longitude: sitterData.longitude,
                bio: sitterData.bio,
                workdayStartHour: sitterData.workdayStartHour,
                workdayEndHour: sitterData.workdayEndHour,
            };
            return this.update(userId, updateData);
        }
        else {
            const sitterRecord = new this.petSitterModel({
                user: userId,
                hourlyRate: sitterData.hourlyRate,
                sitterAddress: sitterData.sitterAddress,
                services: sitterData.services || [],
                yearsOfExperience: sitterData.yearsOfExperience,
                availableWeekends: sitterData.availableWeekends ?? false,
                canHostPets: sitterData.canHostPets ?? false,
                availability: availabilityDates || [],
                latitude: sitterData.latitude,
                longitude: sitterData.longitude,
                bio: sitterData.bio,
                workdayStartHour: sitterData.workdayStartHour ?? 8,
                workdayEndHour: sitterData.workdayEndHour ?? 18,
            });
            petSitter = await sitterRecord.save();
            await petSitter.populate('user');
            await this.userModel
                .findByIdAndUpdate(userId, {
                $set: {
                    role: 'sitter',
                },
            })
                .exec();
            console.log(`[Sitter Conversion] User ${userId} converted to sitter role`);
        }
        const updatedUser = await this.usersService.findOne(userId);
        return updatedUser;
    }
};
exports.PetSittersService = PetSittersService;
exports.PetSittersService = PetSittersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(pet_sitter_schema_1.PetSitter.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        users_service_1.UsersService,
        mail_service_1.MailService])
], PetSittersService);
//# sourceMappingURL=pet-sitters.service.js.map