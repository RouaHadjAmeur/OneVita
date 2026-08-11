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
exports.FoodSafetyReportSchema = exports.FoodSafetyReport = exports.EnvironmentReportSchema = exports.EnvironmentReport = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let EnvironmentReport = class EnvironmentReport {
};
exports.EnvironmentReport = EnvironmentReport;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], EnvironmentReport.prototype, "reporter", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['illegal_waste', 'water_pollution', 'unsafe_drinking_water', 'unsafe_food', 'air_pollution', 'dead_animal', 'chemical_spill', 'burning_waste', 'oil_leakage', 'construction_waste', 'noise_pollution', 'other'] }),
    __metadata("design:type", String)
], EnvironmentReport.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, maxlength: 2000 }),
    __metadata("design:type", String)
], EnvironmentReport.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], EnvironmentReport.prototype, "mediaUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['uploaded', 'pending'], default: 'uploaded' }),
    __metadata("design:type", String)
], EnvironmentReport.prototype, "mediaUploadStatus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['image', 'video'], default: 'image' }),
    __metadata("design:type", String)
], EnvironmentReport.prototype, "mediaType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: -90, max: 90 }),
    __metadata("design:type", Number)
], EnvironmentReport.prototype, "latitude", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: -180, max: 180 }),
    __metadata("design:type", Number)
], EnvironmentReport.prototype, "longitude", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['submitted', 'under_review', 'confirmed', 'resolved', 'rejected'], default: 'submitted', index: true }),
    __metadata("design:type", String)
], EnvironmentReport.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['low', 'moderate', 'high', 'critical'], default: 'moderate' }),
    __metadata("design:type", String)
], EnvironmentReport.prototype, "severity", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EnvironmentReport.prototype, "authorityNote", void 0);
exports.EnvironmentReport = EnvironmentReport = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'environment_reports' })
], EnvironmentReport);
exports.EnvironmentReportSchema = mongoose_1.SchemaFactory.createForClass(EnvironmentReport);
exports.EnvironmentReportSchema.index({ latitude: 1, longitude: 1, createdAt: -1 });
let FoodSafetyReport = class FoodSafetyReport {
};
exports.FoodSafetyReport = FoodSafetyReport;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], FoodSafetyReport.prototype, "reporter", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], FoodSafetyReport.prototype, "barcode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FoodSafetyReport.prototype, "productName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['strange_smell', 'expired', 'wrong_packaging', 'mold', 'foreign_object', 'fake_product', 'food_poisoning', 'other'] }),
    __metadata("design:type", String)
], FoodSafetyReport.prototype, "issueType", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FoodSafetyReport.prototype, "batchNumber", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FoodSafetyReport.prototype, "purchaseLocation", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FoodSafetyReport.prototype, "purchaseState", void 0);
__decorate([
    (0, mongoose_1.Prop)({ maxlength: 2000 }),
    __metadata("design:type", String)
], FoodSafetyReport.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FoodSafetyReport.prototype, "symptoms", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], FoodSafetyReport.prototype, "photoUrl", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['submitted', 'under_review', 'confirmed', 'resolved', 'rejected'], default: 'submitted' }),
    __metadata("design:type", String)
], FoodSafetyReport.prototype, "status", void 0);
exports.FoodSafetyReport = FoodSafetyReport = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'food_safety_reports' })
], FoodSafetyReport);
exports.FoodSafetyReportSchema = mongoose_1.SchemaFactory.createForClass(FoodSafetyReport);
exports.FoodSafetyReportSchema.index({ barcode: 1, status: 1, createdAt: -1 });
//# sourceMappingURL=environment-report.schema.js.map