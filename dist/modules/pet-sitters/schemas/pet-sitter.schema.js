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
exports.PetSitterSchema = exports.PetSitter = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let PetSitter = class PetSitter {
};
exports.PetSitter = PetSitter;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, unique: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], PetSitter.prototype, "user", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], PetSitter.prototype, "hourlyRate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PetSitter.prototype, "sitterAddress", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], PetSitter.prototype, "services", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PetSitter.prototype, "yearsOfExperience", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], PetSitter.prototype, "availableWeekends", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], PetSitter.prototype, "canHostPets", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Date], default: [] }),
    __metadata("design:type", Array)
], PetSitter.prototype, "availability", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PetSitter.prototype, "latitude", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PetSitter.prototype, "longitude", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PetSitter.prototype, "bio", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 0, max: 23, default: 8 }),
    __metadata("design:type", Number)
], PetSitter.prototype, "workdayStartHour", void 0);
__decorate([
    (0, mongoose_1.Prop)({ min: 1, max: 24, default: 18 }),
    __metadata("design:type", Number)
], PetSitter.prototype, "workdayEndHour", void 0);
exports.PetSitter = PetSitter = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pet-sitters' })
], PetSitter);
exports.PetSitterSchema = mongoose_1.SchemaFactory.createForClass(PetSitter);
//# sourceMappingURL=pet-sitter.schema.js.map