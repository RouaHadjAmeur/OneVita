export declare class CreateVetDto {
    email: string;
    name: string;
    password: string;
    phoneNumber?: string;
    licenseNumber: string;
    clinicName: string;
    clinicAddress: string;
    specializations?: string[];
    yearsOfExperience?: number;
    latitude?: number;
    longitude?: number;
    bio?: string;
    licenseImageBase64?: string;
    clinicImageBase64?: string;
}
