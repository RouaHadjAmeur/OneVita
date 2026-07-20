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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AiHealthReportResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class AiHealthReportResponseDto {
}
exports.AiHealthReportResponseDto = AiHealthReportResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Needs Attention' }),
    __metadata("design:type", String)
], AiHealthReportResponseDto.prototype, "status", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Add a short interactive play session today.' }),
    __metadata("design:type", String)
], AiHealthReportResponseDto.prototype, "dailyTip", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Dora needs follow-up care for her recorded asthma.',
    }),
    __metadata("design:type", String)
], AiHealthReportResponseDto.prototype, "summary", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String], example: ['FVRCP', 'Rabies'] }),
    __metadata("design:type", Array)
], AiHealthReportResponseDto.prototype, "missingVaccinations", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], AiHealthReportResponseDto.prototype, "chronicConditionNotes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ type: [String] }),
    __metadata("design:type", Array)
], AiHealthReportResponseDto.prototype, "recommendedActions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: '2026-07-20T10:00:00.000Z' }),
    __metadata("design:type", String)
], AiHealthReportResponseDto.prototype, "generatedAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'AI-generated guidance only; consult a licensed veterinarian for diagnosis and treatment.',
    }),
    __metadata("design:type", String)
], AiHealthReportResponseDto.prototype, "disclaimer", void 0);
//# sourceMappingURL=ai-health-report-response.dto.js.map