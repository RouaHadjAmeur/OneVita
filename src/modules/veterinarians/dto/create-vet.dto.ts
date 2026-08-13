// src/modules/veterinarians/dto/create-vet.dto.ts

import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  MinLength,
} from 'class-validator';

export class CreateVetDto {
  // User base fields
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  // Vet-specific required fields
  @IsNotEmpty()
  @IsString()
  licenseNumber: string;

  @IsNotEmpty()
  @IsString()
  clinicName: string;

  @IsNotEmpty()
  @IsString()
  clinicAddress: string;

  // Vet-specific optional fields
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

  // Base64-encoded images (data URI or raw base64), uploaded to Cloudinary on save
  @IsOptional()
  @IsString()
  licenseImageBase64?: string;

  @IsOptional()
  @IsString()
  clinicImageBase64?: string;
}
