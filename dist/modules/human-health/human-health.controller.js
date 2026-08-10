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
exports.HumanHealthController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const user_schema_1 = require("../users/schemas/user.schema");
const human_health_dto_1 = require("./dto/human-health.dto");
const human_health_service_1 = require("./human-health.service");
let HumanHealthController = class HumanHealthController {
    constructor(humanHealthService) {
        this.humanHealthService = humanHealthService;
    }
    getProfile(user) {
        return this.humanHealthService.getProfile(this.userId(user));
    }
    getOneHealthAssessment(user) {
        return this.humanHealthService.generateOneHealthAssessment(this.userId(user));
    }
    replaceProfile(user, dto) {
        return this.humanHealthService.replaceProfile(this.userId(user), dto);
    }
    addMetric(user, dto) {
        return this.humanHealthService.addMetric(this.userId(user), dto);
    }
    removeMetric(user, id) {
        return this.humanHealthService.removeItem(this.userId(user), 'metrics', id);
    }
    updateMetric(user, id, dto) {
        return this.humanHealthService.updateMetric(this.userId(user), id, dto);
    }
    addMedication(user, dto) {
        return this.humanHealthService.addMedication(this.userId(user), dto);
    }
    updateMedication(user, id, dto) {
        return this.humanHealthService.updateMedication(this.userId(user), id, dto);
    }
    recordMedicationTaken(user, id) {
        return this.humanHealthService.recordMedicationTaken(this.userId(user), id);
    }
    removeMedication(user, id) {
        return this.humanHealthService.removeItem(this.userId(user), 'medications', id);
    }
    addRecord(user, dto) {
        return this.humanHealthService.addRecord(this.userId(user), dto);
    }
    updateRecord(user, id, dto) {
        return this.humanHealthService.updateRecord(this.userId(user), id, dto);
    }
    removeRecord(user, id) {
        return this.humanHealthService.removeItem(this.userId(user), 'records', id);
    }
    addAppointment(user, dto) {
        return this.humanHealthService.addAppointment(this.userId(user), dto);
    }
    updateAppointment(user, id, dto) {
        return this.humanHealthService.updateAppointment(this.userId(user), id, dto);
    }
    removeAppointment(user, id) {
        return this.humanHealthService.removeItem(this.userId(user), 'appointments', id);
    }
    updateEmergencyProfile(user, dto) {
        return this.humanHealthService.updateEmergencyProfile(this.userId(user), dto);
    }
    userId(user) {
        return String(user._id ?? user.id);
    }
};
exports.HumanHealthController = HumanHealthController;
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get the authenticated user health profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "getProfile", null);
__decorate([
    (0, common_1.Get)('one-health-assessment'),
    (0, swagger_1.ApiOperation)({
        summary: 'Generate a bidirectional human and pet One Health assessment',
    }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "getOneHealthAssessment", null);
__decorate([
    (0, common_1.Put)(),
    (0, swagger_1.ApiOperation)({ summary: 'Replace the authenticated user health profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User,
        human_health_dto_1.ReplaceHumanHealthProfileDto]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "replaceProfile", null);
__decorate([
    (0, common_1.Post)('metrics'),
    (0, swagger_1.ApiOperation)({ summary: 'Record a health metric' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, human_health_dto_1.CreateHealthMetricDto]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "addMetric", null);
__decorate([
    (0, common_1.Delete)('metrics/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, String]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "removeMetric", null);
__decorate([
    (0, common_1.Put)('metrics/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, String, human_health_dto_1.CreateHealthMetricDto]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "updateMetric", null);
__decorate([
    (0, common_1.Post)('medications'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a medication' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User,
        human_health_dto_1.CreateHumanMedicationDto]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "addMedication", null);
__decorate([
    (0, common_1.Put)('medications/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, String, human_health_dto_1.CreateHumanMedicationDto]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "updateMedication", null);
__decorate([
    (0, common_1.Patch)('medications/:id/taken'),
    (0, swagger_1.ApiOperation)({ summary: 'Record medication adherence' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, String]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "recordMedicationTaken", null);
__decorate([
    (0, common_1.Delete)('medications/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, String]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "removeMedication", null);
__decorate([
    (0, common_1.Post)('records'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a medical record' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User,
        human_health_dto_1.CreateHumanMedicalRecordDto]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "addRecord", null);
__decorate([
    (0, common_1.Put)('records/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a medical record' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, String, human_health_dto_1.CreateHumanMedicalRecordDto]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "updateRecord", null);
__decorate([
    (0, common_1.Delete)('records/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, String]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "removeRecord", null);
__decorate([
    (0, common_1.Post)('appointments'),
    (0, swagger_1.ApiOperation)({ summary: 'Add a human-health appointment' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User,
        human_health_dto_1.CreateHumanAppointmentDto]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "addAppointment", null);
__decorate([
    (0, common_1.Put)('appointments/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, String, human_health_dto_1.CreateHumanAppointmentDto]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "updateAppointment", null);
__decorate([
    (0, common_1.Delete)('appointments/:id'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User, String]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "removeAppointment", null);
__decorate([
    (0, common_1.Put)('emergency-profile'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Create or replace the emergency health profile' }),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [user_schema_1.User,
        human_health_dto_1.UpdateEmergencyHealthProfileDto]),
    __metadata("design:returntype", void 0)
], HumanHealthController.prototype, "updateEmergencyProfile", null);
exports.HumanHealthController = HumanHealthController = __decorate([
    (0, swagger_1.ApiTags)('human-health'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('human-health'),
    __metadata("design:paramtypes", [human_health_service_1.HumanHealthService])
], HumanHealthController);
//# sourceMappingURL=human-health.controller.js.map