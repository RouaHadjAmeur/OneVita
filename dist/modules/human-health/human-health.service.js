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
exports.HumanHealthService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const human_health_profile_schema_1 = require("./schemas/human-health-profile.schema");
let HumanHealthService = class HumanHealthService {
    constructor(profileModel) {
        this.profileModel = profileModel;
    }
    async getProfile(userId) {
        return this.profileModel
            .findOneAndUpdate({ user: new mongoose_2.Types.ObjectId(userId) }, { $setOnInsert: { user: new mongoose_2.Types.ObjectId(userId) } }, { new: true, upsert: true, setDefaultsOnInsert: true })
            .exec();
    }
    async addMetric(userId, dto) {
        return this.push(userId, 'metrics', {
            _id: new mongoose_2.Types.ObjectId(),
            ...dto,
            recordedAt: new Date(dto.recordedAt),
        });
    }
    async addMedication(userId, dto) {
        return this.push(userId, 'medications', {
            _id: new mongoose_2.Types.ObjectId(),
            ...dto,
            active: dto.active ?? true,
            adherenceHistory: [],
        });
    }
    async addRecord(userId, dto) {
        return this.push(userId, 'records', {
            _id: new mongoose_2.Types.ObjectId(),
            ...dto,
            date: new Date(dto.date),
        });
    }
    async addAppointment(userId, dto) {
        return this.push(userId, 'appointments', {
            _id: new mongoose_2.Types.ObjectId(),
            ...dto,
            date: new Date(dto.date),
        });
    }
    async updateEmergencyProfile(userId, dto) {
        return this.profileModel
            .findOneAndUpdate({ user: new mongoose_2.Types.ObjectId(userId) }, {
            $set: { emergencyProfile: dto },
            $setOnInsert: { user: new mongoose_2.Types.ObjectId(userId) },
        }, { new: true, upsert: true, setDefaultsOnInsert: true })
            .exec();
    }
    async replaceProfile(userId, dto) {
        const withId = (value) => ({
            _id: new mongoose_2.Types.ObjectId(),
            ...value,
        });
        return this.profileModel
            .findOneAndUpdate({ user: new mongoose_2.Types.ObjectId(userId) }, {
            $set: {
                metrics: dto.metrics.map((item) => withId({ ...item, recordedAt: new Date(item.recordedAt) })),
                medications: dto.medications.map((item) => withId({
                    ...item,
                    active: item.active ?? true,
                    adherenceHistory: [],
                })),
                records: dto.records.map((item) => withId({ ...item, date: new Date(item.date) })),
                appointments: dto.appointments.map((item) => withId({ ...item, date: new Date(item.date) })),
                emergencyProfile: dto.emergencyProfile,
            },
            $setOnInsert: { user: new mongoose_2.Types.ObjectId(userId) },
        }, { new: true, upsert: true, setDefaultsOnInsert: true })
            .exec();
    }
    async recordMedicationTaken(userId, medicationId) {
        const profile = await this.profileModel
            .findOneAndUpdate({
            user: new mongoose_2.Types.ObjectId(userId),
            'medications._id': this.objectId(medicationId),
        }, { $push: { 'medications.$.adherenceHistory': new Date() } }, { new: true })
            .exec();
        if (!profile)
            throw new common_1.NotFoundException('Medication not found');
        return profile;
    }
    async removeItem(userId, collection, itemId) {
        const profile = await this.profileModel
            .findOneAndUpdate({
            user: new mongoose_2.Types.ObjectId(userId),
            [`${collection}._id`]: this.objectId(itemId),
        }, { $pull: { [collection]: { _id: this.objectId(itemId) } } }, { new: true })
            .exec();
        if (!profile)
            throw new common_1.NotFoundException('Health item not found');
        return profile;
    }
    async push(userId, collection, value) {
        return this.profileModel
            .findOneAndUpdate({ user: new mongoose_2.Types.ObjectId(userId) }, {
            $push: { [collection]: value },
            $setOnInsert: { user: new mongoose_2.Types.ObjectId(userId) },
        }, { new: true, upsert: true, setDefaultsOnInsert: true })
            .exec();
    }
    objectId(value) {
        if (!mongoose_2.Types.ObjectId.isValid(value)) {
            throw new common_1.NotFoundException('Health item not found');
        }
        return new mongoose_2.Types.ObjectId(value);
    }
};
exports.HumanHealthService = HumanHealthService;
exports.HumanHealthService = HumanHealthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(human_health_profile_schema_1.HumanHealthProfile.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], HumanHealthService);
//# sourceMappingURL=human-health.service.js.map