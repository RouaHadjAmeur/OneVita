import { Model, Types } from 'mongoose';
import { CreateHealthMetricDto, CreateHumanAppointmentDto, CreateHumanMedicalRecordDto, CreateHumanMedicationDto, ReplaceHumanHealthProfileDto, UpdateEmergencyHealthProfileDto } from './dto/human-health.dto';
import { HumanHealthProfile, HumanHealthProfileDocument } from './schemas/human-health-profile.schema';
import { PetDocument } from '../pets/schemas/pet.schema';
import { GeminiService } from '../ai/gemini.service';
import { NotificationsService } from '../notifications/notifications.service';
export declare class HumanHealthService {
    private readonly profileModel;
    private readonly petModel;
    private readonly geminiService;
    private readonly notificationsService;
    constructor(profileModel: Model<HumanHealthProfileDocument>, petModel: Model<PetDocument>, geminiService: GeminiService, notificationsService: NotificationsService);
    getProfile(userId: string): Promise<HumanHealthProfileDocument>;
    generateOneHealthAssessment(userId: string): Promise<{
        overallRisk: any;
        summary: any;
        alerts: any;
        environmentalRecommendations: string[];
        limitations: string[];
    } | {
        analysisMode: string;
        overallRisk: string;
        summary: string;
        alerts: any[];
        environmentalRecommendations: any[];
        limitations: string[];
        generatedAt: string;
        disclaimer: string;
    }>;
    private validateOneHealthAssessment;
    private localOneHealthFallback;
    private strings;
    private publishOneHealthAlerts;
    addMetric(userId: string, dto: CreateHealthMetricDto): Promise<import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateMetric(userId: string, id: string, dto: CreateHealthMetricDto): Promise<import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    addMedication(userId: string, dto: CreateHumanMedicationDto): Promise<import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateMedication(userId: string, id: string, dto: CreateHumanMedicationDto): Promise<import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    addRecord(userId: string, dto: CreateHumanMedicalRecordDto): Promise<import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateRecord(userId: string, recordId: string, dto: CreateHumanMedicalRecordDto): Promise<HumanHealthProfileDocument>;
    addAppointment(userId: string, dto: CreateHumanAppointmentDto): Promise<import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
        _id: Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateAppointment(userId: string, id: string, dto: CreateHumanAppointmentDto): Promise<import("mongoose").Document<unknown, {}, HumanHealthProfile, {}, {}> & HumanHealthProfile & {
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
    private updateItem;
    private objectId;
}
