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
const pet_schema_1 = require("../pets/schemas/pet.schema");
const gemini_service_1 = require("../ai/gemini.service");
const notifications_service_1 = require("../notifications/notifications.service");
let HumanHealthService = class HumanHealthService {
    constructor(profileModel, petModel, geminiService, notificationsService) {
        this.profileModel = profileModel;
        this.petModel = petModel;
        this.geminiService = geminiService;
        this.notificationsService = notificationsService;
    }
    async getProfile(userId) {
        return this.profileModel
            .findOneAndUpdate({ user: new mongoose_2.Types.ObjectId(userId) }, { $setOnInsert: { user: new mongoose_2.Types.ObjectId(userId) } }, { new: true, upsert: true, setDefaultsOnInsert: true })
            .exec();
    }
    async generateOneHealthAssessment(userId) {
        const [profile, pets] = await Promise.all([
            this.getProfile(userId),
            this.petModel
                .find({ owner: new mongoose_2.Types.ObjectId(userId) })
                .populate('medicalHistory')
                .lean()
                .exec(),
        ]);
        const petRecords = pets.map((pet) => ({
            id: String(pet._id),
            name: pet.name,
            species: pet.species,
            breed: pet.breed ?? null,
            age: pet.age ?? null,
            vaccinations: pet.medicalHistory?.vaccinations ?? [],
            chronicConditions: pet.medicalHistory?.chronicConditions ?? [],
            currentMedications: pet.medicalHistory?.currentMedications ?? [],
        }));
        const humanRecord = {
            allergies: profile.emergencyProfile?.allergies ?? [],
            chronicConditions: profile.emergencyProfile?.chronicConditions ?? [],
            activeMedications: (profile.medications ?? [])
                .filter((item) => item.active)
                .map((item) => ({
                name: item.name,
                dosage: item.dosage,
                notes: item.notes ?? null,
            })),
            medicalRecords: (profile.records ?? []).map((item) => ({
                category: item.category,
                title: item.title,
                details: item.details,
                date: item.date,
            })),
        };
        const base = {
            generatedAt: new Date().toISOString(),
            disclaimer: 'AI-generated educational guidance only. It is not a diagnosis. Consult a physician and veterinarian for clinical assessment.',
        };
        if (petRecords.length === 0) {
            return {
                ...base,
                analysisMode: 'local_screening',
                overallRisk: 'unknown',
                summary: 'Add a pet profile to enable household One Health analysis.',
                alerts: [],
                environmentalRecommendations: [],
                limitations: [
                    'No pet profiles are recorded.',
                    'No live environmental feed is connected.',
                ],
            };
        }
        const prompt = `You are OneVita's cautious One Health risk-screening assistant. Analyze ONLY the supplied human and pet records for possible bidirectional human-animal health considerations. Do not diagnose and do not claim a condition is zoonotic without presenting it as a possibility requiring professional confirmation.

Pet records:\n${JSON.stringify(petRecords)}
Human record:\n${JSON.stringify(humanRecord)}

Return ONLY valid JSON using exactly this shape:
{"overallRisk":"low|moderate|high|unknown","summary":"concise household summary","alerts":[{"direction":"pet_to_human|human_to_pet|shared_environment","riskLevel":"low|moderate|high|unknown","title":"short title","petId":"supplied pet id or null","petName":"supplied pet name or null","recordedEvidence":["recorded facts"],"explanation":"possible connection and uncertainty","transmissionRoutes":["possible routes"],"preventiveMeasures":["low-risk steps"],"recommendedConsultations":["physician and/or veterinarian"]}],"environmentalRecommendations":["advice supported by records"],"limitations":["missing context"]}

Rules:
- Never invent symptoms, diagnoses, tests, exposure, pregnancy, immune status, age, or household members.
- Missing vaccination entries are unverified, not proof of missing vaccination.
- Chronic conditions are not automatically infectious or zoonotic.
- Mention human medication only for accidental pet-ingestion prevention; never advise changing it.
- If no credible connection exists, return no alerts and low or unknown risk.
- Include absent symptoms, lab confirmation, human age, immune status, household members, and live environmental readings in limitations when relevant.`;
        try {
            const response = await this.geminiService.generateText(prompt, {
                temperature: 0.2,
                maxTokens: 2600,
                maxRetries: 1,
            });
            const parsed = JSON.parse(response
                .trim()
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```$/, ''));
            const result = this.validateOneHealthAssessment(parsed, {
                ...base,
                analysisMode: 'free_ai',
            });
            await this.publishOneHealthAlerts(userId, result.alerts);
            return result;
        }
        catch {
            const result = this.localOneHealthFallback(petRecords, humanRecord, base);
            await this.publishOneHealthAlerts(userId, result.alerts);
            return result;
        }
    }
    validateOneHealthAssessment(parsed, base) {
        const risks = new Set(['low', 'moderate', 'high', 'unknown']);
        const directions = new Set([
            'pet_to_human',
            'human_to_pet',
            'shared_environment',
        ]);
        if (!risks.has(parsed?.overallRisk) ||
            typeof parsed?.summary !== 'string' ||
            !Array.isArray(parsed?.alerts)) {
            throw new Error('Invalid One Health assessment');
        }
        return {
            ...base,
            overallRisk: parsed.overallRisk,
            summary: parsed.summary,
            alerts: parsed.alerts
                .filter((item) => directions.has(item?.direction) &&
                risks.has(item?.riskLevel) &&
                typeof item?.title === 'string' &&
                typeof item?.explanation === 'string')
                .map((item) => ({
                direction: item.direction,
                riskLevel: item.riskLevel,
                title: item.title,
                petId: typeof item.petId === 'string' ? item.petId : null,
                petName: typeof item.petName === 'string' ? item.petName : null,
                recordedEvidence: this.strings(item.recordedEvidence),
                explanation: item.explanation,
                transmissionRoutes: this.strings(item.transmissionRoutes),
                preventiveMeasures: this.strings(item.preventiveMeasures),
                recommendedConsultations: this.strings(item.recommendedConsultations),
            })),
            environmentalRecommendations: this.strings(parsed.environmentalRecommendations),
            limitations: this.strings(parsed.limitations),
        };
    }
    localOneHealthFallback(pets, human, base) {
        const alerts = pets
            .filter((pet) => pet.chronicConditions.length > 0)
            .map((pet) => ({
            direction: 'pet_to_human',
            riskLevel: 'unknown',
            title: `${pet.name}'s recorded condition needs One Health review`,
            petId: pet.id,
            petName: pet.name,
            recordedEvidence: pet.chronicConditions,
            explanation: 'The record alone cannot establish whether this condition is infectious or transmissible. A veterinarian and physician should assess any shared-health relevance.',
            transmissionRoutes: [],
            preventiveMeasures: [
                'Wash hands after handling the pet or cleaning waste.',
                'Avoid sharing food and keep frequently touched surfaces clean.',
            ],
            recommendedConsultations: [
                'Ask the veterinarian whether the recorded condition poses any human-health risk.',
            ],
        }));
        if (human.activeMedications.length > 0) {
            alerts.push({
                direction: 'human_to_pet',
                riskLevel: 'low',
                title: 'Keep human medications away from pets',
                petId: null,
                petName: null,
                recordedEvidence: human.activeMedications.map((item) => item.name),
                explanation: 'Accidental ingestion of human medication can harm animals. This does not mean the recorded medicine is unsafe when used by its patient.',
                transmissionRoutes: ['Accidental ingestion'],
                preventiveMeasures: [
                    'Store medication in a closed cabinet and never give it to a pet unless prescribed by a veterinarian.',
                ],
                recommendedConsultations: [
                    'Contact a veterinarian or animal poison service after suspected ingestion.',
                ],
            });
        }
        return {
            ...base,
            analysisMode: 'local_screening',
            overallRisk: alerts.length > 0 ? 'unknown' : 'low',
            summary: alerts.length > 0
                ? 'Recorded information has One Health considerations that need professional confirmation.'
                : 'No specific cross-health concern was identified from the recorded information.',
            alerts,
            environmentalRecommendations: [
                'Keep shared living areas ventilated and clean, and protect people and pets from extreme heat, smoke, and poor air quality alerts.',
            ],
            limitations: [
                'Free AI was unavailable, so a conservative local screening was used.',
                'Symptoms, laboratory confirmation, human age, immune status, household members, and live environmental readings are not recorded.',
            ],
        };
    }
    strings(value) {
        return Array.isArray(value)
            ? value.filter((item) => typeof item === 'string')
            : [];
    }
    async publishOneHealthAlerts(userId, alerts) {
        await Promise.all(alerts
            .filter((alert) => alert.riskLevel !== 'low')
            .map((alert) => {
            const alertKey = [
                alert.direction,
                alert.petId ?? 'household',
                alert.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            ].join(':');
            return this.notificationsService.createOneHealthAlertIfNew(userId, alertKey, 'One Health Alert', alert.title, {
                direction: alert.direction,
                riskLevel: alert.riskLevel,
                petId: alert.petId,
                petName: alert.petName,
            });
        }));
    }
    async addMetric(userId, dto) {
        return this.push(userId, 'metrics', {
            _id: new mongoose_2.Types.ObjectId(),
            ...dto,
            recordedAt: new Date(dto.recordedAt),
        });
    }
    async updateMetric(userId, id, dto) {
        return this.updateItem(userId, 'metrics', id, {
            type: dto.type,
            value: dto.value,
            unit: dto.unit,
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
    async updateMedication(userId, id, dto) {
        return this.updateItem(userId, 'medications', id, {
            name: dto.name,
            dosage: dto.dosage,
            schedule: dto.schedule,
            notes: dto.notes,
            active: dto.active ?? true,
        });
    }
    async addRecord(userId, dto) {
        return this.push(userId, 'records', {
            _id: new mongoose_2.Types.ObjectId(),
            ...dto,
            date: new Date(dto.date),
        });
    }
    async updateRecord(userId, recordId, dto) {
        const profile = await this.profileModel
            .findOneAndUpdate({
            user: new mongoose_2.Types.ObjectId(userId),
            'records._id': this.objectId(recordId),
        }, {
            $set: {
                'records.$.category': dto.category,
                'records.$.title': dto.title,
                'records.$.details': dto.details,
                'records.$.date': new Date(dto.date),
            },
        }, { new: true })
            .exec();
        if (!profile)
            throw new common_1.NotFoundException('Medical record not found');
        return profile;
    }
    async addAppointment(userId, dto) {
        return this.push(userId, 'appointments', {
            _id: new mongoose_2.Types.ObjectId(),
            ...dto,
            date: new Date(dto.date),
        });
    }
    async updateAppointment(userId, id, dto) {
        return this.updateItem(userId, 'appointments', id, {
            provider: dto.provider,
            reason: dto.reason,
            date: new Date(dto.date),
            location: dto.location,
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
    async updateItem(userId, collection, itemId, value) {
        const updates = Object.fromEntries(Object.entries(value).map(([key, item]) => [
            `${collection}.$.${key}`,
            item,
        ]));
        const profile = await this.profileModel
            .findOneAndUpdate({
            user: new mongoose_2.Types.ObjectId(userId),
            [`${collection}._id`]: this.objectId(itemId),
        }, { $set: updates }, { new: true })
            .exec();
        if (!profile)
            throw new common_1.NotFoundException('Health item not found');
        return profile;
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
    __param(1, (0, mongoose_1.InjectModel)(pet_schema_1.Pet.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        gemini_service_1.GeminiService,
        notifications_service_1.NotificationsService])
], HumanHealthService);
//# sourceMappingURL=human-health.service.js.map