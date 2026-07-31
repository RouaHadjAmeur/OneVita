import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { User } from '../users/schemas/user.schema';
import {
  CreateHealthMetricDto,
  CreateHumanAppointmentDto,
  CreateHumanMedicalRecordDto,
  CreateHumanMedicationDto,
  ReplaceHumanHealthProfileDto,
  UpdateEmergencyHealthProfileDto,
} from './dto/human-health.dto';
import { HumanHealthService } from './human-health.service';

@ApiTags('human-health')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('human-health')
export class HumanHealthController {
  constructor(private readonly humanHealthService: HumanHealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get the authenticated user health profile' })
  getProfile(@CurrentUser() user: User) {
    return this.humanHealthService.getProfile(this.userId(user));
  }

  @Get('one-health-assessment')
  @ApiOperation({
    summary: 'Generate a bidirectional human and pet One Health assessment',
  })
  getOneHealthAssessment(@CurrentUser() user: User) {
    return this.humanHealthService.generateOneHealthAssessment(
      this.userId(user),
    );
  }

  @Put()
  @ApiOperation({ summary: 'Replace the authenticated user health profile' })
  replaceProfile(
    @CurrentUser() user: User,
    @Body() dto: ReplaceHumanHealthProfileDto,
  ) {
    return this.humanHealthService.replaceProfile(this.userId(user), dto);
  }

  @Post('metrics')
  @ApiOperation({ summary: 'Record a health metric' })
  addMetric(@CurrentUser() user: User, @Body() dto: CreateHealthMetricDto) {
    return this.humanHealthService.addMetric(this.userId(user), dto);
  }

  @Delete('metrics/:id')
  removeMetric(@CurrentUser() user: User, @Param('id') id: string) {
    return this.humanHealthService.removeItem(this.userId(user), 'metrics', id);
  }

  @Put('metrics/:id')
  updateMetric(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateHealthMetricDto,
  ) {
    return this.humanHealthService.updateMetric(this.userId(user), id, dto);
  }

  @Post('medications')
  @ApiOperation({ summary: 'Add a medication' })
  addMedication(
    @CurrentUser() user: User,
    @Body() dto: CreateHumanMedicationDto,
  ) {
    return this.humanHealthService.addMedication(this.userId(user), dto);
  }

  @Put('medications/:id')
  updateMedication(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateHumanMedicationDto,
  ) {
    return this.humanHealthService.updateMedication(
      this.userId(user),
      id,
      dto,
    );
  }

  @Patch('medications/:id/taken')
  @ApiOperation({ summary: 'Record medication adherence' })
  recordMedicationTaken(@CurrentUser() user: User, @Param('id') id: string) {
    return this.humanHealthService.recordMedicationTaken(this.userId(user), id);
  }

  @Delete('medications/:id')
  removeMedication(@CurrentUser() user: User, @Param('id') id: string) {
    return this.humanHealthService.removeItem(
      this.userId(user),
      'medications',
      id,
    );
  }

  @Post('records')
  @ApiOperation({ summary: 'Add a medical record' })
  addRecord(
    @CurrentUser() user: User,
    @Body() dto: CreateHumanMedicalRecordDto,
  ) {
    return this.humanHealthService.addRecord(this.userId(user), dto);
  }

  @Put('records/:id')
  @ApiOperation({ summary: 'Update a medical record' })
  updateRecord(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateHumanMedicalRecordDto,
  ) {
    return this.humanHealthService.updateRecord(this.userId(user), id, dto);
  }

  @Delete('records/:id')
  removeRecord(@CurrentUser() user: User, @Param('id') id: string) {
    return this.humanHealthService.removeItem(this.userId(user), 'records', id);
  }

  @Post('appointments')
  @ApiOperation({ summary: 'Add a human-health appointment' })
  addAppointment(
    @CurrentUser() user: User,
    @Body() dto: CreateHumanAppointmentDto,
  ) {
    return this.humanHealthService.addAppointment(this.userId(user), dto);
  }

  @Put('appointments/:id')
  updateAppointment(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: CreateHumanAppointmentDto,
  ) {
    return this.humanHealthService.updateAppointment(
      this.userId(user),
      id,
      dto,
    );
  }

  @Delete('appointments/:id')
  removeAppointment(@CurrentUser() user: User, @Param('id') id: string) {
    return this.humanHealthService.removeItem(
      this.userId(user),
      'appointments',
      id,
    );
  }

  @Put('emergency-profile')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create or replace the emergency health profile' })
  updateEmergencyProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateEmergencyHealthProfileDto,
  ) {
    return this.humanHealthService.updateEmergencyProfile(
      this.userId(user),
      dto,
    );
  }

  private userId(user: User): string {
    return String(user._id ?? user.id);
  }
}
