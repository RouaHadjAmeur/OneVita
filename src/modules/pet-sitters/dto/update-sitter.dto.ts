// src/modules/pet-sitters/dto/update-sitter.dto.ts

import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  IsBoolean,
  IsDate,
  IsEmail,
} from 'class-validator';

export class UpdateSitterDto {
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
  @IsNumber()
  hourlyRate?: number;

  @IsOptional()
  @IsString()
  sitterAddress?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;

  @IsOptional()
  @IsBoolean()
  availableWeekends?: boolean;

  @IsOptional()
  @IsBoolean()
  canHostPets?: boolean;

  @IsOptional()
  @IsArray()
  availability?: (Date | string)[]; // Accept both Date objects and ISO date strings

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
  @IsNumber()
  workdayStartHour?: number;

  @IsOptional()
  @IsNumber()
  workdayEndHour?: number;
}
