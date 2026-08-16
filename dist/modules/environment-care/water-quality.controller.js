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
exports.WaterQualityController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const water_quality_service_1 = require("./water-quality.service");
let WaterQualityController = class WaterQualityController {
    constructor(waterQuality) {
        this.waterQuality = waterQuality;
    }
    get(lat, lng) {
        return this.waterQuality.getConditions(Number(lat), Number(lng));
    }
};
exports.WaterQualityController = WaterQualityController;
__decorate([
    (0, common_1.Get)('water-quality'),
    (0, swagger_1.ApiOperation)({ summary: 'Get Copernicus satellite lake-water conditions' }),
    __param(0, (0, common_1.Query)('lat')),
    __param(1, (0, common_1.Query)('lng')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], WaterQualityController.prototype, "get", null);
exports.WaterQualityController = WaterQualityController = __decorate([
    (0, swagger_1.ApiTags)('environment'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('environment'),
    __metadata("design:paramtypes", [water_quality_service_1.WaterQualityService])
], WaterQualityController);
//# sourceMappingURL=water-quality.controller.js.map