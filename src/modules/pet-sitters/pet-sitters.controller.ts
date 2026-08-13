// src/modules/pet-sitters/pet-sitters.controller.ts

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
import { PetSittersService } from './pet-sitters.service';
import { CreateSitterDto } from './dto/create-sitter.dto';
import { UpdateSitterDto } from './dto/update-sitter.dto';
import { User } from '../users/schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('pet-sitters')
export class PetSittersController {
  constructor(private readonly petSittersService: PetSittersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createSitterDto: CreateSitterDto): Promise<User> {
    return this.petSittersService.create(createSitterDto);
  }

  @Get()
  async findAll(
    @Query('excludeUserId') excludeUserId?: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ): Promise<User[]> {
    return this.petSittersService.findAll(
      excludeUserId,
      latitude == null ? undefined : Number(latitude),
      longitude == null ? undefined : Number(longitude),
    );
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.petSittersService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @CurrentUser() currentUser: User,
    @Body() updateSitterDto: UpdateSitterDto,
  ): Promise<User> {
    if (String(currentUser._id ?? currentUser.id) !== id) {
      throw new Error('You can only update your own sitter profile');
    }
    return this.petSittersService.update(id, updateSitterDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string): Promise<void> {
    return this.petSittersService.remove(id);
  }

  // Convert existing user to pet sitter (called from join form)
  @Post('convert/:userId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async convertUserToSitter(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: User,
    @Body() sitterData: Omit<CreateSitterDto, 'email' | 'name' | 'password'>,
  ): Promise<User> {
    // Ensure user can only convert themselves
    if (currentUser._id.toString() !== userId) {
      throw new Error('You can only convert your own account');
    }
    return this.petSittersService.convertUserToSitter(userId, sitterData);
  }
}
