"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PetsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const pets_service_1 = require("./pets.service");
const create_pet_dto_1 = require("./dto/create-pet.dto");
const update_pet_dto_1 = require("./dto/update-pet.dto");
let PetsController = class PetsController {
    constructor(petsService) {
        this.petsService = petsService;
    }
    async create(ownerId, createPetDto, file) {
        return this.petsService.create(ownerId, createPetDto, file);
    }
    async findAllByOwner(ownerId) {
        return this.petsService.findAllByOwner(ownerId);
    }
    async findOne(petId) {
        return this.petsService.findOne(petId);
    }
    async update(petId, updatePetDto, file) {
        return this.petsService.update(petId, updatePetDto, file);
    }
    async delete(ownerId, petId) {
        return this.petsService.delete(petId, ownerId);
    }
};
exports.PetsController = PetsController;
__decorate([
    (0, common_1.Post)('owner/:ownerId'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo')),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new pet with optional photo' }),
    (0, swagger_1.ApiParam)({ name: 'ownerId', description: 'Owner (User) ID' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            required: ['name', 'species'],
            properties: {
                photo: {
                    type: 'string',
                    format: 'binary',
                    description: 'Pet photo file (optional)',
                },
                name: {
                    type: 'string',
                    description: 'Pet name',
                    example: 'Max',
                },
                species: {
                    type: 'string',
                    description: 'Pet species',
                    example: 'dog',
                },
                breed: {
                    type: 'string',
                    description: 'Pet breed',
                    example: 'Golden Retriever',
                },
                age: {
                    type: 'number',
                    description: 'Pet age in years',
                    example: 3,
                },
                gender: {
                    type: 'string',
                    description: 'Pet gender',
                    example: 'male',
                },
                color: {
                    type: 'string',
                    description: 'Pet color',
                    example: 'golden',
                },
                weight: {
                    type: 'number',
                    description: 'Pet weight in kg',
                    example: 30,
                },
                height: {
                    type: 'number',
                    description: 'Pet height in cm',
                    example: 60,
                },
                microchipId: {
                    type: 'string',
                    description: 'Microchip ID',
                    example: 'CHIP123456',
                },
            },
        },
    }),
    __param(0, (0, common_1.Param)('ownerId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_pet_dto_1.CreatePetDto, Object]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('owner/:ownerId'),
    __param(0, (0, common_1.Param)('ownerId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "findAllByOwner", null);
__decorate([
    (0, common_1.Get)(':petId'),
    __param(0, (0, common_1.Param)('petId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':petId'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo')),
    (0, swagger_1.ApiOperation)({ summary: 'Update pet with optional photo' }),
    (0, swagger_1.ApiParam)({ name: 'petId', description: 'Pet ID' }),
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                photo: {
                    type: 'string',
                    format: 'binary',
                    description: 'New pet photo file (optional, replaces old one)',
                },
                name: {
                    type: 'string',
                    description: 'Pet name',
                },
                species: {
                    type: 'string',
                    description: 'Pet species',
                },
                breed: {
                    type: 'string',
                    description: 'Pet breed',
                },
                age: {
                    type: 'number',
                    description: 'Pet age in years',
                },
                gender: {
                    type: 'string',
                    description: 'Pet gender',
                },
                color: {
                    type: 'string',
                    description: 'Pet color',
                },
                weight: {
                    type: 'number',
                    description: 'Pet weight in kg',
                },
                height: {
                    type: 'number',
                    description: 'Pet height in cm',
                },
            },
        },
    }),
    __param(0, (0, common_1.Param)('petId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_pet_dto_1.UpdatePetDto, Object]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':ownerId/:petId'),
    __param(0, (0, common_1.Param)('ownerId')),
    __param(1, (0, common_1.Param)('petId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], PetsController.prototype, "delete", null);
exports.PetsController = PetsController = __decorate([
    (0, swagger_1.ApiTags)('pets'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('pets'),
    __metadata("design:paramtypes", [pets_service_1.PetsService])
], PetsController);
//# sourceMappingURL=pets.controller.js.map