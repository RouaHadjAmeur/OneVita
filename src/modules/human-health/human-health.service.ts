import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CreateHealthMetricDto,
  CreateHumanAppointmentDto,
  CreateHumanMedicalRecordDto,
  CreateHumanMedicationDto,
  ReplaceHumanHealthProfileDto,
  UpdateEmergencyHealthProfileDto,
} from './dto/human-health.dto';
import {
  HumanHealthProfile,
  HumanHealthProfileDocument,
} from './schemas/human-health-profile.schema';
import { Pet, PetDocument } from '../pets/schemas/pet.schema';
import { GeminiService } from '../ai/gemini.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class HumanHealthService {
  constructor(
    @InjectModel(HumanHealthProfile.name)
    private readonly profileModel: Model<HumanHealthProfileDocument>,
    @InjectModel(Pet.name)
    private readonly petModel: Model<PetDocument>,
    private readonly geminiService: GeminiService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getProfile(userId: string): Promise<HumanHealthProfileDocument> {
    return this.profileModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        { $setOnInsert: { user: new Types.ObjectId(userId) } },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async generateOneHealthAssessment(userId: string) {
    const [profile, pets] = await Promise.all([
      this.getProfile(userId),
      this.petModel
        .find({ owner: new Types.ObjectId(userId) })
        .populate('medicalHistory')
        .lean()
        .exec(),
    ]);
    const petRecords = pets.map((pet: any) => ({
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
      chronicConditions:
        profile.emergencyProfile?.chronicConditions ?? [],
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
      disclaimer:
        'AI-generated educational guidance only. It is not a diagnosis. Consult a physician and veterinarian for clinical assessment.',
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
      const parsed = JSON.parse(
        response
          .trim()
          .replace(/^```(?:json)?\s*/i, '')
          .replace(/\s*```$/, ''),
      );
      const result = this.validateOneHealthAssessment(parsed, {
        ...base,
        analysisMode: 'free_ai',
      });
      await this.publishOneHealthAlerts(userId, result.alerts);
      return result;
    } catch {
      const result = this.localOneHealthFallback(
        petRecords,
        humanRecord,
        base,
      );
      await this.publishOneHealthAlerts(userId, result.alerts);
      return result;
    }
  }

  private validateOneHealthAssessment(parsed: any, base: object) {
    const risks = new Set(['low', 'moderate', 'high', 'unknown']);
    const directions = new Set([
      'pet_to_human',
      'human_to_pet',
      'shared_environment',
    ]);
    if (
      !risks.has(parsed?.overallRisk) ||
      typeof parsed?.summary !== 'string' ||
      !Array.isArray(parsed?.alerts)
    ) {
      throw new Error('Invalid One Health assessment');
    }
    return {
      ...base,
      overallRisk: parsed.overallRisk,
      summary: parsed.summary,
      alerts: parsed.alerts
        .filter(
          (item: any) =>
            directions.has(item?.direction) &&
            risks.has(item?.riskLevel) &&
            typeof item?.title === 'string' &&
            typeof item?.explanation === 'string',
        )
        .map((item: any) => ({
          direction: item.direction,
          riskLevel: item.riskLevel,
          title: item.title,
          petId: typeof item.petId === 'string' ? item.petId : null,
          petName: typeof item.petName === 'string' ? item.petName : null,
          recordedEvidence: this.strings(item.recordedEvidence),
          explanation: item.explanation,
          transmissionRoutes: this.strings(item.transmissionRoutes),
          preventiveMeasures: this.strings(item.preventiveMeasures),
          recommendedConsultations: this.strings(
            item.recommendedConsultations,
          ),
        })),
      environmentalRecommendations: this.strings(
        parsed.environmentalRecommendations,
      ),
      limitations: this.strings(parsed.limitations),
    };
  }

  private localOneHealthFallback(
    pets: any[],
    human: any,
    base: object,
  ) {
    const alerts: any[] = pets
      .filter((pet) => pet.chronicConditions.length > 0)
      .map((pet) => ({
        direction: 'pet_to_human',
        riskLevel: 'unknown',
        title: `${pet.name}'s recorded condition needs One Health review`,
        petId: pet.id,
        petName: pet.name,
        recordedEvidence: pet.chronicConditions,
        explanation:
          'The record alone cannot establish whether this condition is infectious or transmissible. A veterinarian and physician should assess any shared-health relevance.',
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
        recordedEvidence: human.activeMedications.map(
          (item: any) => item.name,
        ),
        explanation:
          'Accidental ingestion of human medication can harm animals. This does not mean the recorded medicine is unsafe when used by its patient.',
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

  private strings(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === 'string')
      : [];
  }

  private async publishOneHealthAlerts(userId: string, alerts: any[]) {
    await Promise.all(
      alerts
        .filter((alert) => alert.riskLevel !== 'low')
        .map((alert) => {
          const alertKey = [
            alert.direction,
            alert.petId ?? 'household',
            alert.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          ].join(':');
          return this.notificationsService.createOneHealthAlertIfNew(
            userId,
            alertKey,
            'One Health Alert',
            alert.title,
            {
              direction: alert.direction,
              riskLevel: alert.riskLevel,
              petId: alert.petId,
              petName: alert.petName,
            },
          );
        }),
    );
  }

  async addMetric(userId: string, dto: CreateHealthMetricDto) {
    return this.push(userId, 'metrics', {
      _id: new Types.ObjectId(),
      ...dto,
      recordedAt: new Date(dto.recordedAt),
    });
  }

  async updateMetric(userId: string, id: string, dto: CreateHealthMetricDto) {
    return this.updateItem(userId, 'metrics', id, {
      type: dto.type,
      value: dto.value,
      unit: dto.unit,
      recordedAt: new Date(dto.recordedAt),
    });
  }

  async addMedication(userId: string, dto: CreateHumanMedicationDto) {
    return this.push(userId, 'medications', {
      _id: new Types.ObjectId(),
      ...dto,
      active: dto.active ?? true,
      adherenceHistory: [],
    });
  }

  async updateMedication(
    userId: string,
    id: string,
    dto: CreateHumanMedicationDto,
  ) {
    return this.updateItem(userId, 'medications', id, {
      name: dto.name,
      dosage: dto.dosage,
      schedule: dto.schedule,
      notes: dto.notes,
      active: dto.active ?? true,
    });
  }

  async addRecord(userId: string, dto: CreateHumanMedicalRecordDto) {
    return this.push(userId, 'records', {
      _id: new Types.ObjectId(),
      ...dto,
      date: new Date(dto.date),
    });
  }

  async updateRecord(
    userId: string,
    recordId: string,
    dto: CreateHumanMedicalRecordDto,
  ): Promise<HumanHealthProfileDocument> {
    const profile = await this.profileModel
      .findOneAndUpdate(
        {
          user: new Types.ObjectId(userId),
          'records._id': this.objectId(recordId),
        },
        {
          $set: {
            'records.$.category': dto.category,
            'records.$.title': dto.title,
            'records.$.details': dto.details,
            'records.$.date': new Date(dto.date),
          },
        },
        { new: true },
      )
      .exec();
    if (!profile) throw new NotFoundException('Medical record not found');
    return profile;
  }

  async addAppointment(userId: string, dto: CreateHumanAppointmentDto) {
    return this.push(userId, 'appointments', {
      _id: new Types.ObjectId(),
      ...dto,
      date: new Date(dto.date),
    });
  }

  async updateAppointment(
    userId: string,
    id: string,
    dto: CreateHumanAppointmentDto,
  ) {
    return this.updateItem(userId, 'appointments', id, {
      provider: dto.provider,
      reason: dto.reason,
      date: new Date(dto.date),
      location: dto.location,
    });
  }

  async updateEmergencyProfile(
    userId: string,
    dto: UpdateEmergencyHealthProfileDto,
  ) {
    return this.profileModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        {
          $set: { emergencyProfile: dto },
          $setOnInsert: { user: new Types.ObjectId(userId) },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async replaceProfile(userId: string, dto: ReplaceHumanHealthProfileDto) {
    const withId = <T extends Record<string, unknown>>(value: T) => ({
      _id: new Types.ObjectId(),
      ...value,
    });
    return this.profileModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        {
          $set: {
            metrics: dto.metrics.map((item) =>
              withId({ ...item, recordedAt: new Date(item.recordedAt) }),
            ),
            medications: dto.medications.map((item) =>
              withId({
                ...item,
                active: item.active ?? true,
                adherenceHistory: [],
              }),
            ),
            records: dto.records.map((item) =>
              withId({ ...item, date: new Date(item.date) }),
            ),
            appointments: dto.appointments.map((item) =>
              withId({ ...item, date: new Date(item.date) }),
            ),
            emergencyProfile: dto.emergencyProfile,
          },
          $setOnInsert: { user: new Types.ObjectId(userId) },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  async recordMedicationTaken(
    userId: string,
    medicationId: string,
  ): Promise<HumanHealthProfileDocument> {
    const profile = await this.profileModel
      .findOneAndUpdate(
        {
          user: new Types.ObjectId(userId),
          'medications._id': this.objectId(medicationId),
        },
        { $push: { 'medications.$.adherenceHistory': new Date() } },
        { new: true },
      )
      .exec();
    if (!profile) throw new NotFoundException('Medication not found');
    return profile;
  }

  async removeItem(
    userId: string,
    collection: 'metrics' | 'medications' | 'records' | 'appointments',
    itemId: string,
  ): Promise<HumanHealthProfileDocument> {
    const profile = await this.profileModel
      .findOneAndUpdate(
        {
          user: new Types.ObjectId(userId),
          [`${collection}._id`]: this.objectId(itemId),
        },
        { $pull: { [collection]: { _id: this.objectId(itemId) } } },
        { new: true },
      )
      .exec();
    if (!profile) throw new NotFoundException('Health item not found');
    return profile;
  }

  private async push(
    userId: string,
    collection: 'metrics' | 'medications' | 'records' | 'appointments',
    value: Record<string, unknown>,
  ): Promise<HumanHealthProfileDocument> {
    return this.profileModel
      .findOneAndUpdate(
        { user: new Types.ObjectId(userId) },
        {
          $push: { [collection]: value },
          $setOnInsert: { user: new Types.ObjectId(userId) },
        },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      )
      .exec();
  }

  private async updateItem(
    userId: string,
    collection: 'metrics' | 'medications' | 'appointments',
    itemId: string,
    value: Record<string, unknown>,
  ): Promise<HumanHealthProfileDocument> {
    const updates = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        `${collection}.$.${key}`,
        item,
      ]),
    );
    const profile = await this.profileModel
      .findOneAndUpdate(
        {
          user: new Types.ObjectId(userId),
          [`${collection}._id`]: this.objectId(itemId),
        },
        { $set: updates },
        { new: true },
      )
      .exec();
    if (!profile) throw new NotFoundException('Health item not found');
    return profile;
  }

  private objectId(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new NotFoundException('Health item not found');
    }
    return new Types.ObjectId(value);
  }
}
