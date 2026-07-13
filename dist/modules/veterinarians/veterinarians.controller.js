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
exports.VeterinariansController = void 0;
const common_1 = require("@nestjs/common");
const veterinarians_service_1 = require("./veterinarians.service");
const create_vet_dto_1 = require("./dto/create-vet.dto");
const update_vet_dto_1 = require("./dto/update-vet.dto");
const user_schema_1 = require("../users/schemas/user.schema");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
let VeterinariansController = class VeterinariansController {
    constructor(veterinariansService) {
        this.veterinariansService = veterinariansService;
    }
    async create(createVetDto) {
        return this.veterinariansService.create(createVetDto);
    }
    async findAll(excludeUserId) {
        return this.veterinariansService.findAll(excludeUserId);
    }
    async findOne(id) {
        return this.veterinariansService.findOne(id);
    }
    async update(id, updateVetDto) {
        return this.veterinariansService.update(id, updateVetDto);
    }
    async remove(id) {
        return this.veterinariansService.remove(id);
    }
    async convertUserToVet(userId, currentUser, vetData) {
        if (currentUser._id.toString() !== userId) {
            throw new Error('You can only convert your own account');
        }
        return this.veterinariansService.convertUserToVet(userId, vetData);
    }
};
exports.VeterinariansController = VeterinariansController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_vet_dto_1.CreateVetDto]),
    __metadata("design:returntype", Promise)
], VeterinariansController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('excludeUserId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VeterinariansController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VeterinariansController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_vet_dto_1.UpdateVetDto]),
    __metadata("design:returntype", Promise)
], VeterinariansController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VeterinariansController.prototype, "remove", null);
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
], VeterinariansController.prototype, "convertUserToVet", null);
exports.VeterinariansController = VeterinariansController = __decorate([
    (0, common_1.Controller)('veterinarians'),
    __metadata("design:paramtypes", [veterinarians_service_1.VeterinariansService])
], VeterinariansController);
//# sourceMappingURL=veterinarians.controller.js.map