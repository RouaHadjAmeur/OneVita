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

@Injectable()
export class HumanHealthService {
  constructor(
    @InjectModel(HumanHealthProfile.name)
    private readonly profileModel: Model<HumanHealthProfileDocument>,
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

  async addMetric(userId: string, dto: CreateHealthMetricDto) {
    return this.push(userId, 'metrics', {
      _id: new Types.ObjectId(),
      ...dto,
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

  async addRecord(userId: string, dto: CreateHumanMedicalRecordDto) {
    return this.push(userId, 'records', {
      _id: new Types.ObjectId(),
      ...dto,
      date: new Date(dto.date),
    });
  }

  async addAppointment(userId: string, dto: CreateHumanAppointmentDto) {
    return this.push(userId, 'appointments', {
      _id: new Types.ObjectId(),
      ...dto,
      date: new Date(dto.date),
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

  private objectId(value: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(value)) {
      throw new NotFoundException('Health item not found');
    }
    return new Types.ObjectId(value);
  }
}
