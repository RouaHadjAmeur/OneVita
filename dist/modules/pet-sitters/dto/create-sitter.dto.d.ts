export declare class CreateSitterDto {
    email: string;
    name: string;
    password: string;
    phoneNumber?: string;
    hourlyRate: number;
    sitterAddress: string;
    services?: string[];
    yearsOfExperience?: number;
    availableWeekends?: boolean;
    canHostPets?: boolean;
    availability?: (Date | string)[];
    latitude?: number;
    longitude?: number;
    bio?: string;
    workdayStartHour?: number;
    workdayEndHour?: number;
}
