export declare class CreateHealthMetricDto {
    type: string;
    value: number;
    unit: string;
    recordedAt: string;
}
export declare class CreateHumanMedicationDto {
    name: string;
    dosage: string;
    schedule: string;
    notes?: string;
    active?: boolean;
}
export declare class CreateHumanMedicalRecordDto {
    category: string;
    title: string;
    details: string;
    date: string;
}
export declare class CreateHumanAppointmentDto {
    provider: string;
    reason: string;
    date: string;
    location?: string;
}
export declare class UpdateEmergencyHealthProfileDto {
    bloodType?: string;
    allergies?: string[];
    chronicConditions?: string[];
    emergencyContactName?: string;
    emergencyContactPhone?: string;
}
export declare class ReplaceHumanHealthProfileDto {
    metrics: CreateHealthMetricDto[];
    medications: CreateHumanMedicationDto[];
    records: CreateHumanMedicalRecordDto[];
    appointments: CreateHumanAppointmentDto[];
    emergencyProfile: UpdateEmergencyHealthProfileDto;
}
