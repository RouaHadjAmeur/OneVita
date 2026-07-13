// src/modules/pets/pets.controller.ts
import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  Put,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';

@ApiTags('pets')
@UseGuards(JwtAuthGuard)
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

  @Post('owner/:ownerId')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Create a new pet with optional photo' })
  @ApiParam({ name: 'ownerId', description: 'Owner (User) ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'species'],
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Pet photo file (optional)',
        },
        name: {
          type: 'string',
          description: 'Pet name',
          example: 'Max',
        },
        species: {
          type: 'string',
          description: 'Pet species',
          example: 'dog',
        },
        breed: {
          type: 'string',
          description: 'Pet breed',
          example: 'Golden Retriever',
        },
        age: {
          type: 'number',
          description: 'Pet age in years',
          example: 3,
        },
        gender: {
          type: 'string',
          description: 'Pet gender',
          example: 'male',
        },
        color: {
          type: 'string',
          description: 'Pet color',
          example: 'golden',
        },
        weight: {
          type: 'number',
          description: 'Pet weight in kg',
          example: 30,
        },
        height: {
          type: 'number',
          description: 'Pet height in cm',
          example: 60,
        },
        microchipId: {
          type: 'string',
          description: 'Microchip ID',
          example: 'CHIP123456',
        },
      },
    },
  })
  async create(
    @Param('ownerId') ownerId: string,
    @Body() createPetDto: CreatePetDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.petsService.create(ownerId, createPetDto, file);
  }

  @Get('owner/:ownerId')
  async findAllByOwner(@Param('ownerId') ownerId: string) {
    return this.petsService.findAllByOwner(ownerId);
  }

  @Get(':petId')
  async findOne(@Param('petId') petId: string) {
    return this.petsService.findOne(petId);
  }

  @Put(':petId')
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Update pet with optional photo' })
  @ApiParam({ name: 'petId', description: 'Pet ID' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        photo: {
          type: 'string',
          format: 'binary',
          description: 'New pet photo file (optional, replaces old one)',
        },
        name: {
          type: 'string',
          description: 'Pet name',
        },
        species: {
          type: 'string',
          description: 'Pet species',
        },
        breed: {
          type: 'string',
          description: 'Pet breed',
        },
        age: {
          type: 'number',
          description: 'Pet age in years',
        },
        gender: {
          type: 'string',
          description: 'Pet gender',
        },
        color: {
          type: 'string',
          description: 'Pet color',
        },
        weight: {
          type: 'number',
          description: 'Pet weight in kg',
        },
        height: {
          type: 'number',
          description: 'Pet height in cm',
        },
      },
    },
  })
  async update(
    @Param('petId') petId: string,
    @Body() updatePetDto: UpdatePetDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.petsService.update(petId, updatePetDto, file);
  }

  @Delete(':ownerId/:petId')
  async delete(
    @Param('ownerId') ownerId: string,
    @Param('petId') petId: string,
  ) {
    return this.petsService.delete(petId, ownerId);
  }
}
