import { Model, Types } from 'mongoose';
import { CreateHealthMetricDto, CreateHumanAppointmentDto, CreateHumanMedicalRecordDto, CreateHumanMedicationDto, ReplaceHumanHealthProfileDto, UpdateEmergencyHealthProfileDto } from './dto/human-health.dto';
import { HumanHealthProfile, HumanHealthProfileDocument } from './schemas/human-health-profile.schema';
export declare class HumanHealthService {
    private readonly profileModel;
    constructor(profileModel: Model<HumanHealthProfileDocument>);
    getProfile(userId: string): Promise<HumanHealthProfileDocument>;
    addMetric(userId: string, dto: CreateHealthMetricDto): Promise<import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    addMedication(userId: string, dto: CreateHumanMedicationDto): Promise<import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    addRecord(userId: string, dto: CreateHumanMedicalRecordDto): Promise<import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    addAppointment(userId: string, dto: CreateHumanAppointmentDto): Promise<import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateEmergencyProfile(userId: string, dto: UpdateEmergencyHealthProfileDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
    replaceProfile(userId: string, dto: ReplaceHumanHealthProfileDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: Types.ObjectId;
    }>>;
    recordMedicationTaken(userId: string, medicationId: string): Promise<HumanHealthProfileDocument>;
    removeItem(userId: string, collection: 'metrics' | 'medications' | 'records' | 'appointments', itemId: string): Promise<HumanHealthProfileDocument>;
    private push;
    private objectId;
}
