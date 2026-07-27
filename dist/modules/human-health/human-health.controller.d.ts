import { User } from '../users/schemas/user.schema';
import { CreateHealthMetricDto, CreateHumanAppointmentDto, CreateHumanMedicalRecordDto, CreateHumanMedicationDto, ReplaceHumanHealthProfileDto, UpdateEmergencyHealthProfileDto } from './dto/human-health.dto';
import { HumanHealthService } from './human-health.service';
export declare class HumanHealthController {
    private readonly humanHealthService;
    constructor(humanHealthService: HumanHealthService);
    getProfile(user: User): Promise<import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    replaceProfile(user: User, dto: ReplaceHumanHealthProfileDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    addMetric(user: User, dto: CreateHealthMetricDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    removeMetric(user: User, id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    addMedication(user: User, dto: CreateHumanMedicationDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    recordMedicationTaken(user: User, id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    removeMedication(user: User, id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    addRecord(user: User, dto: CreateHumanMedicalRecordDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    removeRecord(user: User, id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    addAppointment(user: User, dto: CreateHumanAppointmentDto): Promise<import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    removeAppointment(user: User, id: string): Promise<import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }>;
    updateEmergencyProfile(user: User, dto: UpdateEmergencyHealthProfileDto): Promise<import("mongoose").Document<unknown, {}, import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    }, {}, {}> & import("mongoose").Document<unknown, {}, import("./schemas/human-health-profile.schema").HumanHealthProfile, {}, {}> & import("./schemas/human-health-profile.schema").HumanHealthProfile & {
        _id: import("mongoose").Types.ObjectId;
    } & {
        __v: number;
    } & Required<{
        _id: import("mongoose").Types.ObjectId;
    }>>;
    private userId;
}
