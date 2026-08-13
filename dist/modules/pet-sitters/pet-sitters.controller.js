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
exports.PetSittersController = void 0;
const common_1 = require("@nestjs/common");
const pet_sitters_service_1 = require("./pet-sitters.service");
const create_sitter_dto_1 = require("./dto/create-sitter.dto");
const update_sitter_dto_1 = require("./dto/update-sitter.dto");
const user_schema_1 = require("../users/schemas/user.schema");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let PetSittersController = class PetSittersController {
    constructor(petSittersService) {
        this.petSittersService = petSittersService;
    }
    async create(createSitterDto) {
        return this.petSittersService.create(createSitterDto);
    }
    async findAll(excludeUserId, latitude, longitude) {
        return this.petSittersService.findAll(excludeUserId, latitude == null ? undefined : Number(latitude), longitude == null ? undefined : Number(longitude));
    }
    async findOne(id) {
        return this.petSittersService.findOne(id);
    }
    async update(id, currentUser, updateSitterDto) {
        if (String(currentUser._id ?? currentUser.id) !== id) {
            throw new Error('You can only update your own sitter profile');
        }
        return this.petSittersService.update(id, updateSitterDto);
    }
    async remove(id) {
        return this.petSittersService.remove(id);
    }
    async convertUserToSitter(userId, currentUser, sitterData) {
        if (currentUser._id.toString() !== userId) {
            throw new Error('You can only convert your own account');
        }
        return this.petSittersService.convertUserToSitter(userId, sitterData);
    }
};
exports.PetSittersController = PetSittersController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_sitter_dto_1.CreateSitterDto]),
    __metadata("design:returntype", Promise)
], PetSittersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('excludeUserId')),
    __param(1, (0, common_1.Query)('latitude')),
    __param(2, (0, common_1.Query)('longitude')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], PetSittersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PetSittersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_schema_1.User,
        update_sitter_dto_1.UpdateSitterDto]),
    __metadata("design:returntype", Promise)
], PetSittersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PetSittersController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('convert/:userId'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_schema_1.User, Object]),
    __metadata("design:returntype", Promise)
], PetSittersController.prototype, "convertUserToSitter", null);
exports.PetSittersController = PetSittersController = __decorate([
    (0, common_1.Controller)('pet-sitters'),
    __metadata("design:paramtypes", [pet_sitters_service_1.PetSittersService])
], PetSittersController);
//# sourceMappingURL=pet-sitters.controller.js.map