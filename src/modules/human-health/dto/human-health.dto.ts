import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class CreateHealthMetricDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  type: string;

  @Type(() => Number)
  @IsNumber()
  value: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  unit: string;

  @IsDateString()
  recordedAt: string;
}

export class CreateHumanMedicationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  dosage: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  schedule: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateHumanMedicalRecordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  category: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @MaxLength(5000)
  details: string;

  @IsDateString()
  date: string;
}

export class CreateHumanAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  provider: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  reason: string;

  @IsDateString()
  date: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  location?: string;
}

export class UpdateEmergencyHealthProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bloodType?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  allergies?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  chronicConditions?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(160)
  emergencyContactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  emergencyContactPhone?: string;
}

export class ReplaceHumanHealthProfileDto {
  @IsArray()
  @ArrayMaxSize(5000)
  @ValidateNested({ each: true })
  @Type(() => CreateHealthMetricDto)
  metrics: CreateHealthMetricDto[];

  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => CreateHumanMedicationDto)
  medications: CreateHumanMedicationDto[];

  @IsArray()
  @ArrayMaxSize(2000)
  @ValidateNested({ each: true })
  @Type(() => CreateHumanMedicalRecordDto)
  records: CreateHumanMedicalRecordDto[];

  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => CreateHumanAppointmentDto)
  appointments: CreateHumanAppointmentDto[];

  @ValidateNested()
  @Type(() => UpdateEmergencyHealthProfileDto)
  emergencyProfile: UpdateEmergencyHealthProfileDto;
}
