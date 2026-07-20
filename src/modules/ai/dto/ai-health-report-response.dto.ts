import { ApiProperty } from '@nestjs/swagger';

export class AiHealthReportResponseDto {
  @ApiProperty({ example: 'Needs Attention' })
  status: string;

  @ApiProperty({ example: 'Add a short interactive play session today.' })
  dailyTip: string;

  @ApiProperty({
    example: 'Dora needs follow-up care for her recorded asthma.',
  })
  summary: string;

  @ApiProperty({ type: [String], example: ['FVRCP', 'Rabies'] })
  missingVaccinations: string[];

  @ApiProperty({ type: [String] })
  chronicConditionNotes: string[];

  @ApiProperty({ type: [String] })
  recommendedActions: string[];

  @ApiProperty({ example: '2026-07-20T10:00:00.000Z' })
  generatedAt: string;

  @ApiProperty({
    example:
      'AI-generated guidance only; consult a licensed veterinarian for diagnosis and treatment.',
  })
  disclaimer: string;
}
