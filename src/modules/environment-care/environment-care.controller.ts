import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/schemas/user.schema';
import { EnvironmentCareService } from './environment-care.service';

@ApiTags('environment-care')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('environment-care')
export class EnvironmentCareController {
  constructor(private readonly service: EnvironmentCareService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get live personalized environment conditions' })
  dashboard(@CurrentUser() user: User) {
    return this.service.getDashboard(String(user._id));
  }
}
