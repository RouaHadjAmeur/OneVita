// src/modules/users/users.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Patch,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Create user (owner by default)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<User> {
    return this.usersService.create(createUserDto);
  }

  // Get all users
  @Get()
  async findAll(): Promise<User[]> {
    return this.usersService.findAll();
  }

  // Get a single user by ID
  @Get(':id')
  async findOne(@Param('id') id: string): Promise<User> {
    const user = await this.usersService.findOne(id);
    if (!user) throw new NotFoundException(`User with ID ${id} not found`);
    return user;
  }

  // Update user
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<User> {
    const updatedUser = await this.usersService.update(id, updateUserDto);
    if (!updatedUser)
      throw new NotFoundException(`User with ID ${id} not found`);
    return updatedUser;
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user profile with optional image upload' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: {
          type: 'string',
          format: 'binary',
          description: 'Profile image file (optional)',
        },
        name: {
          type: 'string',
          description: 'User name',
        },
        phoneNumber: {
          type: 'string',
          description: 'Phone number',
        },
        country: {
          type: 'string',
          description: 'Country',
        },
        city: {
          type: 'string',
          description: 'City',
        },
        hasPhoto: {
          type: 'boolean',
          description: 'Has photo flag',
        },
        hasPets: {
          type: 'boolean',
          description: 'Has pets flag',
        },
      },
    },
  })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() payload: UpdateProfileDto,
    @UploadedFile() file?: Express.Multer.File,
  ): Promise<User> {
    const phoneNumber = payload.phoneNumber ?? payload.phone;
    return this.usersService.updateProfile(
      user._id.toString(),
      {
        name: payload.name,
        phoneNumber,
        country: payload.country,
        city: payload.city,
        latitude: payload.latitude,
        longitude: payload.longitude,
        hasPhoto: payload.hasPhoto,
        hasPets: payload.hasPets,
      },
      file,
    );
  }

  // Delete user
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    const deleted = await this.usersService.remove(id);
    if (!deleted) throw new NotFoundException(`User with ID ${id} not found`);
  }

  @Post('fcm-token')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update FCM token',
    description:
      'Updates the Firebase Cloud Messaging token for push notifications',
  })
  async updateFcmToken(
    @CurrentUser() user: User,
    @Body() body: { fcmToken: string | null },
  ): Promise<{ message: string }> {
    const userId = String(user._id ?? user.id);
    await this.usersService.updateFcmToken(userId, body.fcmToken || null);
    return { message: 'FCM token updated successfully' };
  }
}
