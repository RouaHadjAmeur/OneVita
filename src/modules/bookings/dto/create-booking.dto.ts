import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsString()
  providerId: string; // Vet or Sitter ID

  @IsEnum(['vet', 'sitter'])
  providerType: 'vet' | 'sitter';

  @IsString()
  petId: string;

  @IsString()
  @MinLength(1)
  serviceType: string; // e.g., "Cabinet", "Home Visit", "At Home", "Visit"

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  dateTime: string; // ISO date string

  @IsNumber()
  @IsOptional()
  duration?: number; // Duration in minutes

  @IsNumber()
  @IsOptional()
  price?: number;
}
