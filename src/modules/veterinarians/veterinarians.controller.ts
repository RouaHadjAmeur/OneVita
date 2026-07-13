// src/modules/veterinarians/veterinarians.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Delete,
  Put,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { VeterinariansService } from './veterinarians.service';
import { CreateVetDto } from './dto/create-vet.dto';
import { UpdateVetDto } from './dto/update-vet.dto';
import { User } from '../users/schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('veterinarians')
export class VeterinariansController {
  constructor(private readonly veterinariansService: VeterinariansService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createVetDto: CreateVetDto): Promise<User> {
    return this.veterinariansService.create(createVetDto);
  }

  @Get()
  async findAll(@Query('excludeUserId') excludeUserId?: string): Promise<User[]> {
    return this.veterinariansService.findAll(excludeUserId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.veterinariansService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @Body() updateVetDto: UpdateVetDto,
  ): Promise<User> {
    return this.veterinariansService.update(id, updateVetDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string): Promise<void> {
    return this.veterinariansService.remove(id);
  }

  // Convert existing user to vet (called from join form)
  @Post('convert/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async convertUserToVet(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: User,
    @Body() vetData: Omit<CreateVetDto, 'email' | 'name' | 'password'>,
  ): Promise<User> {
    // Ensure user can only convert themselves
    if (currentUser._id.toString() !== userId) {
      throw new Error('You can only convert your own account');
    }
    return this.veterinariansService.convertUserToVet(userId, vetData);
  }
}
