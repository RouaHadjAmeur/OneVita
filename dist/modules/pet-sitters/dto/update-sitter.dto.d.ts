export declare class UpdateSitterDto {
    email?: string;
    name?: string;
    phoneNumber?: string;
    hourlyRate?: number;
    sitterAddress?: string;
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
