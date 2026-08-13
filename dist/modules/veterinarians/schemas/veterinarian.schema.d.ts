import { Document, Types } from 'mongoose';
export type VeterinarianDocument = Veterinarian & Document;
export declare class Veterinarian {
    _id: Types.ObjectId;
    user: Types.ObjectId;
    licenseNumber: string;
    clinicName: string;
    clinicAddress: string;
    specializations?: string[];
    yearsOfExperience?: number;
    latitude?: number;
    longitude?: number;
    bio?: string;
    education?: string;
    languages?: string[];
    consultationFee?: number;
    licenseImageUrl?: string;
    clinicImageUrl?: string;
}
export declare const VeterinarianSchema: import("mongoose").Schema<Veterinarian, import("mongoose").Model<Veterinarian, any, any, any, Document<unknown, any, Veterinarian, any, {}> & Veterinarian & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Veterinarian, Document<unknown, {}, import("mongoose").FlatRecord<Veterinarian>, {}, import("mongoose").ResolveSchemaOptions<import("mongoose").DefaultSchemaOptions>> & import("mongoose").FlatRecord<Veterinarian> & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}>;
