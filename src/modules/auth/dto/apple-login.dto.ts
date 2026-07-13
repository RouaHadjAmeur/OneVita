import { IsString, IsOptional } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  identity_token!: string;

  // Apple only sends name once (first sign-in) — client must forward it
  @IsOptional()
  @IsString()
  name?: string;
}
