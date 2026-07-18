import {
  IsString,
  IsEnum,
  IsOptional,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class UpdateBookingDto {
  @IsEnum(['pending', 'accepted', 'rejected', 'completed', 'cancelled'])
  @IsOptional()
  status?: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';

  @IsString()
  @IsOptional()
  rejectionReason?: string;

  @IsString()
  @IsOptional()
  cancellationReason?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  providerNote?: string;

  @IsDateString()
  @IsOptional()
  dateTime?: string;
}
