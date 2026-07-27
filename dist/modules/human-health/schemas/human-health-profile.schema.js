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
exports.HumanHealthProfileSchema = exports.HumanHealthProfile = exports.EmergencyHealthProfileSchema = exports.EmergencyHealthProfile = exports.HumanAppointmentSchema = exports.HumanAppointment = exports.HumanMedicalRecordSchema = exports.HumanMedicalRecord = exports.HumanMedicationSchema = exports.HumanMedication = exports.HealthMetricSchema = exports.HealthMetric = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let HealthMetric = class HealthMetric {
};
exports.HealthMetric = HealthMetric;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 80 }),
    __metadata("design:type", String)
], HealthMetric.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], HealthMetric.prototype, "value", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 30 }),
    __metadata("design:type", String)
], HealthMetric.prototype, "unit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: Date }),
    __metadata("design:type", Date)
], HealthMetric.prototype, "recordedAt", void 0);
exports.HealthMetric = HealthMetric = __decorate([
    (0, mongoose_1.Schema)({ _id: true, timestamps: true })
], HealthMetric);
exports.HealthMetricSchema = mongoose_1.SchemaFactory.createForClass(HealthMetric);
let HumanMedication = class HumanMedication {
};
exports.HumanMedication = HumanMedication;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 160 }),
    __metadata("design:type", String)
], HumanMedication.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 100 }),
    __metadata("design:type", String)
], HumanMedication.prototype, "dosage", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 160 }),
    __metadata("design:type", String)
], HumanMedication.prototype, "schedule", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true, maxlength: 1000 }),
    __metadata("design:type", String)
], HumanMedication.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], HumanMedication.prototype, "active", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Date], default: [] }),
    __metadata("design:type", Array)
], HumanMedication.prototype, "adherenceHistory", void 0);
exports.HumanMedication = HumanMedication = __decorate([
    (0, mongoose_1.Schema)({ _id: true, timestamps: true })
], HumanMedication);
exports.HumanMedicationSchema = mongoose_1.SchemaFactory.createForClass(HumanMedication);
let HumanMedicalRecord = class HumanMedicalRecord {
};
exports.HumanMedicalRecord = HumanMedicalRecord;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 80 }),
    __metadata("design:type", String)
], HumanMedicalRecord.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 200 }),
    __metadata("design:type", String)
], HumanMedicalRecord.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true, maxlength: 5000, default: '' }),
    __metadata("design:type", String)
], HumanMedicalRecord.prototype, "details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: Date }),
    __metadata("design:type", Date)
], HumanMedicalRecord.prototype, "date", void 0);
exports.HumanMedicalRecord = HumanMedicalRecord = __decorate([
    (0, mongoose_1.Schema)({ _id: true, timestamps: true })
], HumanMedicalRecord);
exports.HumanMedicalRecordSchema = mongoose_1.SchemaFactory.createForClass(HumanMedicalRecord);
let HumanAppointment = class HumanAppointment {
};
exports.HumanAppointment = HumanAppointment;
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 200 }),
    __metadata("design:type", String)
], HumanAppointment.prototype, "provider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, trim: true, maxlength: 1000 }),
    __metadata("design:type", String)
], HumanAppointment.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, type: Date }),
    __metadata("design:type", Date)
], HumanAppointment.prototype, "date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true, maxlength: 300 }),
    __metadata("design:type", String)
], HumanAppointment.prototype, "location", void 0);
exports.HumanAppointment = HumanAppointment = __decorate([
    (0, mongoose_1.Schema)({ _id: true, timestamps: true })
], HumanAppointment);
exports.HumanAppointmentSchema = mongoose_1.SchemaFactory.createForClass(HumanAppointment);
let EmergencyHealthProfile = class EmergencyHealthProfile {
};
exports.EmergencyHealthProfile = EmergencyHealthProfile;
__decorate([
    (0, mongoose_1.Prop)({ trim: true, maxlength: 10, default: '' }),
    __metadata("design:type", String)
], EmergencyHealthProfile.prototype, "bloodType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], EmergencyHealthProfile.prototype, "allergies", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], EmergencyHealthProfile.prototype, "chronicConditions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true, maxlength: 160, default: '' }),
    __metadata("design:type", String)
], EmergencyHealthProfile.prototype, "emergencyContactName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ trim: true, maxlength: 40, default: '' }),
    __metadata("design:type", String)
], EmergencyHealthProfile.prototype, "emergencyContactPhone", void 0);
exports.EmergencyHealthProfile = EmergencyHealthProfile = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], EmergencyHealthProfile);
exports.EmergencyHealthProfileSchema = mongoose_1.SchemaFactory.createForClass(EmergencyHealthProfile);
let HumanHealthProfile = class HumanHealthProfile {
};
exports.HumanHealthProfile = HumanHealthProfile;
__decorate([
    (0, mongoose_1.Prop)({
        required: true,
        type: mongoose_2.Types.ObjectId,
        ref: 'User',
        unique: true,
        index: true,
    }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], HumanHealthProfile.prototype, "user", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.HealthMetricSchema], default: [] }),
    __metadata("design:type", Array)
], HumanHealthProfile.prototype, "metrics", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.HumanMedicationSchema], default: [] }),
    __metadata("design:type", Array)
], HumanHealthProfile.prototype, "medications", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.HumanMedicalRecordSchema], default: [] }),
    __metadata("design:type", Array)
], HumanHealthProfile.prototype, "records", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.HumanAppointmentSchema], default: [] }),
    __metadata("design:type", Array)
], HumanHealthProfile.prototype, "appointments", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: exports.EmergencyHealthProfileSchema,
        default: () => ({}),
    }),
    __metadata("design:type", EmergencyHealthProfile)
], HumanHealthProfile.prototype, "emergencyProfile", void 0);
exports.HumanHealthProfile = HumanHealthProfile = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'human_health_profiles' })
], HumanHealthProfile);
exports.HumanHealthProfileSchema = mongoose_1.SchemaFactory.createForClass(HumanHealthProfile);
exports.HumanHealthProfileSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_document, result) => {
        delete result.user;
        return result;
    },
});
//# sourceMappingURL=human-health-profile.schema.js.map