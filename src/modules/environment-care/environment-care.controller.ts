import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Request, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

  @Post('reports')
  @UseInterceptors(FileInterceptor('media'))
  createReport(@CurrentUser() user: User, @Body() body: any, @UploadedFile() media: Express.Multer.File) {
    return this.service.createReport(String(user._id), body, media);
  }

  @Get('reports')
  reports(@Query('mine') mine: string, @CurrentUser() user: User) {
    return this.service.getReports(mine === 'true' ? String(user._id) : undefined);
  }

  @Patch('reports/:id')
  updateOwnReport(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.service.updateOwnReport(String(user._id), id, body);
  }

  @Delete('reports/:id')
  deleteOwnReport(@CurrentUser() user: User, @Param('id') id: string) {
    return this.service.deleteOwnReport(String(user._id), id);
  }

  @Patch('reports/:id/status')
  updateReportStatus(@Request() request: any, @Param('id') id: string, @Body() body: any) {
    return this.service.updateReportStatus(request.user.role, id, body);
  }

  @Get('products/:barcode')
  product(@Param('barcode') barcode: string) {
    return this.service.lookupProduct(barcode);
  }

  @Post('food-reports')
  @UseInterceptors(FileInterceptor('photo'))
  createFoodReport(@CurrentUser() user: User, @Body() body: any, @UploadedFile() photo?: Express.Multer.File) {
    return this.service.createFoodReport(String(user._id), body, photo);
  }

  @Get('food-reports')
  foodReports(@Query('barcode') barcode: string) {
    return this.service.getFoodReports(barcode);
  }
}
