import { Document, Types } from 'mongoose';
export type PetSitterDocument = PetSitter & Document;
export declare class PetSitter {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    hourlyRate: number;
    sitterAddress: string;
    services?: string[];
    yearsOfExperience?: number;
    availableWeekends?: boolean;
    canHostPets?: boolean;
    availability?: Date[];
    latitude?: number;
    longitude?: number;
    bio?: string;
    workdayStartHour?: number;
    workdayEndHour?: number;
}
export declare const PetSitterSchema: import("mongoose").Schema<PetSitter, import("mongoose").Model<PetSitter, any, any, any, Document<unknown, any, PetSitter, any, {}> & PetSitter & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PetSitter, Document<unknown, {}, import("mongoose").FlatRecord<PetSitter>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<PetSitter> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
