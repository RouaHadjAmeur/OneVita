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
exports.AiController = void 0;
const common_1 = require("@nestjs/common");
const current_user_decorator_1 = require("../../common/decorators/current-user.decorator");
const user_schema_1 = require("../users/schemas/user.schema");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("../auth/guards/jwt-auth.guard");
const ai_service_1 = require("./ai.service");
const ai_tips_response_dto_1 = require("./dto/ai-tips-response.dto");
const ai_recommendations_response_dto_1 = require("./dto/ai-recommendations-response.dto");
const ai_reminders_response_dto_1 = require("./dto/ai-reminders-response.dto");
const ai_status_response_dto_1 = require("./dto/ai-status-response.dto");
const ai_health_report_response_dto_1 = require("./dto/ai-health-report-response.dto");
let AiController = class AiController {
    constructor(aiService) {
        this.aiService = aiService;
    }
    async getHealthReport(petId, refresh, user) {
        return this.aiService.generateHealthReport(petId, refresh === 'true', String(user?._id ?? user?.id));
    }
    async getTips(petId) {
        try {
            return await this.aiService.generateTips(petId);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not configured')) {
                throw new common_1.HttpException('AI service is temporarily unavailable', common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            if (error instanceof Error &&
                error.message.includes('AI_DAILY_QUOTA_EXCEEDED')) {
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.SERVICE_UNAVAILABLE,
                    message: 'AI daily quota exceeded. Please try again tomorrow or contact support.',
                    code: 'AI_DAILY_QUOTA_EXCEEDED',
                    retryAfter: 86400,
                }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            if (error instanceof Error &&
                (error.message.includes('Rate limit') || error.message.includes('429'))) {
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.SERVICE_UNAVAILABLE,
                    message: 'AI service is rate limited. Please try again in a minute.',
                    code: 'AI_RATE_LIMITED',
                    retryAfter: 60,
                }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            throw error;
        }
    }
    async getRecommendations(petId) {
        try {
            return await this.aiService.generateRecommendations(petId);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not configured')) {
                throw new common_1.HttpException('AI service is temporarily unavailable', common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            if (error instanceof Error &&
                (error.message.includes('Rate limit') || error.message.includes('429'))) {
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.SERVICE_UNAVAILABLE,
                    message: 'AI service is rate limited. Please try again in a minute.',
                    retryAfter: 60,
                }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            throw error;
        }
    }
    async getReminders(petId) {
        try {
            return await this.aiService.generateReminders(petId);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not configured')) {
                throw new common_1.HttpException('AI service is temporarily unavailable', common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            if (error instanceof Error &&
                (error.message.includes('Rate limit') || error.message.includes('429'))) {
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.SERVICE_UNAVAILABLE,
                    message: 'AI service is rate limited. Please try again in a minute.',
                    retryAfter: 60,
                }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            throw error;
        }
    }
    async getStatus(petId) {
        try {
            return await this.aiService.generateStatus(petId);
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('not configured')) {
                throw new common_1.HttpException('AI service is temporarily unavailable', common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            if (error instanceof Error &&
                (error.message.includes('Rate limit') || error.message.includes('429'))) {
                throw new common_1.HttpException({
                    statusCode: common_1.HttpStatus.SERVICE_UNAVAILABLE,
                    message: 'AI service is rate limited. Please try again in a minute.',
                    retryAfter: 60,
                }, common_1.HttpStatus.SERVICE_UNAVAILABLE);
            }
            throw error;
        }
    }
};
exports.AiController = AiController;
__decorate([
    (0, common_1.Get)('pets/:petId/report'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Generate a complete AI health report for a pet' }),
    (0, swagger_1.ApiParam)({ name: 'petId', description: 'Pet ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Successfully generated health report',
        type: ai_health_report_response_dto_1.AiHealthReportResponseDto,
    }),
    __param(0, (0, common_1.Param)('petId')),
    __param(1, (0, common_1.Query)('refresh')),
    __param(2, (0, current_user_decorator_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, user_schema_1.User]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getHealthReport", null);
__decorate([
    (0, common_1.Get)('pets/:petId/tips'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get AI-generated tips for a pet' }),
    (0, swagger_1.ApiParam)({ name: 'petId', description: 'Pet ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Successfully generated tips',
        type: ai_tips_response_dto_1.AiTipsResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Pet not found' }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'AI service unavailable' }),
    __param(0, (0, common_1.Param)('petId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getTips", null);
__decorate([
    (0, common_1.Get)('pets/:petId/recommendations'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get AI-generated recommendations for a pet' }),
    (0, swagger_1.ApiParam)({ name: 'petId', description: 'Pet ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Successfully generated recommendations',
        type: ai_recommendations_response_dto_1.AiRecommendationsResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Pet not found' }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'AI service unavailable' }),
    __param(0, (0, common_1.Param)('petId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getRecommendations", null);
__decorate([
    (0, common_1.Get)('pets/:petId/reminders'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get AI-generated reminders for a pet' }),
    (0, swagger_1.ApiParam)({ name: 'petId', description: 'Pet ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Successfully generated reminders',
        type: ai_reminders_response_dto_1.AiRemindersResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Pet not found' }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'AI service unavailable' }),
    __param(0, (0, common_1.Param)('petId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getReminders", null);
__decorate([
    (0, common_1.Get)('pets/:petId/status'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Get AI-generated health status for a pet' }),
    (0, swagger_1.ApiParam)({ name: 'petId', description: 'Pet ID' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Successfully generated status',
        type: ai_status_response_dto_1.AiStatusResponseDto,
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Pet not found' }),
    (0, swagger_1.ApiResponse)({ status: 503, description: 'AI service unavailable' }),
    __param(0, (0, common_1.Param)('petId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AiController.prototype, "getStatus", null);
exports.AiController = AiController = __decorate([
    (0, swagger_1.ApiTags)('ai'),
    (0, common_1.Controller)('ai'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [ai_service_1.AiService])
], AiController);
//# sourceMappingURL=ai.controller.js.map