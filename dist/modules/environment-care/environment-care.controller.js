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
exports.EnvironmentCareController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const user_schema_1 = require("../users/schemas/user.schema");
const environment_care_service_1 = require("./environment-care.service");
let EnvironmentCareController = class EnvironmentCareController {
    constructor(service) {
        this.service = service;
    }
    dashboard(user) {
        return this.service.getDashboard(String(user._id));
    }
    createReport(user, body, media) {
        return this.service.createReport(String(user._id), body, media);
    }
    reports(mine, user) {
        return this.service.getReports(mine === 'true' ? String(user._id) : undefined);
    }
    updateReportStatus(request, id, body) {
        return this.service.updateReportStatus(request.user.role, id, body);
    }
    product(barcode) {
        return this.service.lookupProduct(barcode);
    }
    createFoodReport(user, body, photo) {
        return this.service.createFoodReport(String(user._id), body, photo);
    }
    foodReports(barcode) {
        return this.service.getFoodReports(barcode);
    }
};
exports.EnvironmentCareController = EnvironmentCareController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get live personalized environment conditions' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User]),
    __metadata("design:returntype", void 0)
], EnvironmentCareController.prototype, "dashboard", null);
__decorate([
    (0, common_1.Post)('reports'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('media')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, Object, Object]),
    __metadata("design:returntype", void 0)
], EnvironmentCareController.prototype, "createReport", null);
__decorate([
    (0, common_1.Get)('reports'),
    __param(0, (0, common_1.Query)('mine')),
    __param(1, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, user_schema_1.User]),
    __metadata("design:returntype", void 0)
], EnvironmentCareController.prototype, "reports", null);
__decorate([
    (0, common_1.Patch)('reports/:id/status'),
    __param(0, (0, common_1.Request)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], EnvironmentCareController.prototype, "updateReportStatus", null);
__decorate([
    (0, common_1.Get)('products/:barcode'),
    __param(0, (0, common_1.Param)('barcode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EnvironmentCareController.prototype, "product", null);
__decorate([
    (0, common_1.Post)('food-reports'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('photo')),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, Object, Object]),
    __metadata("design:returntype", void 0)
], EnvironmentCareController.prototype, "createFoodReport", null);
__decorate([
    (0, common_1.Get)('food-reports'),
    __param(0, (0, common_1.Query)('barcode')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], EnvironmentCareController.prototype, "foodReports", null);
exports.EnvironmentCareController = EnvironmentCareController = __decorate([
    (0, swagger_1.ApiTags)('environment-care'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('environment-care'),
    __metadata("design:paramtypes", [environment_care_service_1.EnvironmentCareService])
], EnvironmentCareController);
//# sourceMappingURL=environment-care.controller.js.map