import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { WaterQualityService } from './water-quality.service';

@ApiTags('environment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('environment')
export class WaterQualityController {
  constructor(private readonly waterQuality: WaterQualityService) {}

  @Get('water-quality')
  @ApiOperation({ summary: 'Get Copernicus satellite lake-water conditions' })
  get(@Query('lat') lat: string, @Query('lng') lng: string) {
    return this.waterQuality.getConditions(Number(lat), Number(lng));
  }
}
