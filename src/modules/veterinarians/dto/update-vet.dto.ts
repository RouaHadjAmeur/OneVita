// src/modules/veterinarians/dto/update-vet.dto.ts

import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsEmail,
} from 'class-validator';

export class UpdateVetDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  licenseNumber?: string;

  @IsOptional()
  @IsString()
  clinicName?: string;

  @IsOptional()
  @IsString()
  clinicAddress?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specializations?: string[];

  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  education?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  languages?: string[];

  @IsOptional()
  @IsNumber()
  consultationFee?: number;

  @IsOptional()
  @IsString()
  licenseImageBase64?: string;

  @IsOptional()
  @IsString()
  clinicImageBase64?: string;
}
