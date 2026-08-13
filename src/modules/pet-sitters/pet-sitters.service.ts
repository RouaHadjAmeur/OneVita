// src/modules/pet-sitters/pet-sitters.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateSitterDto } from './dto/create-sitter.dto';
import { UpdateSitterDto } from './dto/update-sitter.dto';
import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { PetSitter, PetSitterDocument } from './schemas/pet-sitter.schema';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class PetSittersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(PetSitter.name)
    private readonly petSitterModel: Model<PetSitterDocument>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
  ) {}

  async create(createSitterDto: CreateSitterDto): Promise<UserDocument> {
    // Check if user with email already exists
    const existingUser = await this.usersService.findByEmail(
      createSitterDto.email,
    );
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createSitterDto.password, 10);

    // Create sitter user with role 'sitter'
    const sitterData = {
      ...createSitterDto,
      password: hashedPassword,
      role: 'sitter',
      isVerified: false,
      balance: 0,
    };

    const createdUser = await new this.userModel(sitterData).save();

    // Convert availability strings to Date objects if provided
    let availabilityDates: Date[] | undefined;
    if (
      createSitterDto.availability &&
      Array.isArray(createSitterDto.availability)
    ) {
      availabilityDates = createSitterDto.availability.map((date: any) => {
        if (typeof date === 'string') {
          return new Date(date);
        }
        return date instanceof Date ? date : new Date(date);
      });
    }

    // Create pet sitter record in pet-sitters collection
    const petSitter = new this.petSitterModel({
      user: createdUser._id,
      hourlyRate: createSitterDto.hourlyRate,
      sitterAddress: createSitterDto.sitterAddress,
      services: createSitterDto.services || [],
      yearsOfExperience: createSitterDto.yearsOfExperience,
      availableWeekends: createSitterDto.availableWeekends ?? false,
      canHostPets: createSitterDto.canHostPets ?? false,
      availability: availabilityDates || [],
      latitude: createSitterDto.latitude,
      longitude: createSitterDto.longitude,
      bio: createSitterDto.bio,
      workdayStartHour: createSitterDto.workdayStartHour ?? 8,
      workdayEndHour: createSitterDto.workdayEndHour ?? 18,
    });

    await petSitter.save();

    return createdUser;
  }

  async findAll(
    excludeUserId?: string,
    latitude?: number,
    longitude?: number,
  ): Promise<UserDocument[]> {
    const filter =
      excludeUserId && Types.ObjectId.isValid(excludeUserId)
        ? { user: { $ne: new Types.ObjectId(excludeUserId) } }
        : {};
    const sitters = await this.petSitterModel
      .find(filter)
      .populate('user')
      .exec();
    const result = sitters.map((sitter) => {
      const user = sitter.user as unknown as UserDocument;
      if (!user || !('_id' in user)) {
        throw new NotFoundException('User not populated correctly');
      }
      // Merge latitude and longitude from PetSitter into User document
      if (sitter.latitude !== undefined) {
        (user as any).latitude = sitter.latitude;
      }
      if (sitter.longitude !== undefined) {
        (user as any).longitude = sitter.longitude;
      }
      (user as any).sitterAddress = sitter.sitterAddress;
      (user as any).hourlyRate = sitter.hourlyRate;
      (user as any).services = sitter.services;
      (user as any).yearsOfExperience = sitter.yearsOfExperience;
      (user as any).availableWeekends = sitter.availableWeekends;
      (user as any).canHostPets = sitter.canHostPets;
      (user as any).availability = sitter.availability;
      (user as any).bio = sitter.bio;
      (user as any).workdayStartHour = sitter.workdayStartHour;
      (user as any).workdayEndHour = sitter.workdayEndHour;
      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        sitter.latitude != null &&
        sitter.longitude != null
      ) {
        (user as any).distanceKm = this.distanceKm(
          latitude!,
          longitude!,
          sitter.latitude,
          sitter.longitude,
        );
      }
      return user;
    });
    return result.sort(
      (a: any, b: any) =>
        (a.distanceKm ?? Number.MAX_VALUE) - (b.distanceKm ?? Number.MAX_VALUE),
    );
  }

  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const radians = (value: number) => (value * Math.PI) / 180;
    const dLat = radians(lat2 - lat1);
    const dLon = radians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(radians(lat1)) *
        Math.cos(radians(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return Number(
      (6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1),
    );
  }

  async findOne(id: string): Promise<UserDocument> {
    const sitter = await this.petSitterModel
      .findOne({ user: id })
      .populate('user')
      .exec();
    if (!sitter) {
      throw new NotFoundException(`Pet sitter with ID ${id} not found`);
    }
    const user = sitter.user as unknown as UserDocument;
    if (!user || !('_id' in user)) {
      throw new NotFoundException('User not populated correctly');
    }
    // Merge all sitter fields into User document for client consumption
    (user as any).sitterAddress = sitter.sitterAddress;
    (user as any).hourlyRate = sitter.hourlyRate;
    (user as any).services = sitter.services;
    (user as any).yearsOfExperience = sitter.yearsOfExperience;
    (user as any).availableWeekends = sitter.availableWeekends;
    (user as any).canHostPets = sitter.canHostPets;
    (user as any).availability = sitter.availability;
    (user as any).bio = sitter.bio;
    (user as any).workdayStartHour = sitter.workdayStartHour;
    (user as any).workdayEndHour = sitter.workdayEndHour;
    (user as any).latitude = sitter.latitude;
    (user as any).longitude = sitter.longitude;
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.role !== 'sitter') {
      return null;
    }
    const sitter = await this.petSitterModel
      .findOne({ user: user._id })
      .populate('user')
      .exec();
    if (!sitter) {
      return null;
    }
    const populatedUser = sitter.user as unknown as UserDocument;
    return populatedUser && '_id' in populatedUser ? populatedUser : null;
  }

  async update(
    id: string,
    updateSitterDto: UpdateSitterDto,
  ): Promise<UserDocument> {
    // Separate user fields from sitter fields
    const userFields: any = {};
    const sitterFields: any = {};

    // User fields that go to the User model
    if (updateSitterDto.phoneNumber !== undefined) {
      userFields.phone = updateSitterDto.phoneNumber;
    }
    if (updateSitterDto.name !== undefined) {
      userFields.name = updateSitterDto.name;
    }
    if (updateSitterDto.email !== undefined) {
      userFields.email = updateSitterDto.email;
    }

    // Sitter fields that go to the PetSitter model
    if (updateSitterDto.hourlyRate !== undefined) {
      sitterFields.hourlyRate = updateSitterDto.hourlyRate;
    }
    if (updateSitterDto.sitterAddress !== undefined) {
      sitterFields.sitterAddress = updateSitterDto.sitterAddress;
    }
    if (updateSitterDto.services !== undefined) {
      sitterFields.services = updateSitterDto.services;
    }
    if (updateSitterDto.yearsOfExperience !== undefined) {
      sitterFields.yearsOfExperience = updateSitterDto.yearsOfExperience;
    }
    if (updateSitterDto.availableWeekends !== undefined) {
      sitterFields.availableWeekends = updateSitterDto.availableWeekends;
    }
    if (updateSitterDto.canHostPets !== undefined) {
      sitterFields.canHostPets = updateSitterDto.canHostPets;
    }
    if (updateSitterDto.latitude !== undefined) {
      sitterFields.latitude = updateSitterDto.latitude;
    }
    if (updateSitterDto.longitude !== undefined) {
      sitterFields.longitude = updateSitterDto.longitude;
    }
    if (updateSitterDto.bio !== undefined) {
      sitterFields.bio = updateSitterDto.bio;
    }
    if (updateSitterDto.workdayStartHour !== undefined) {
      sitterFields.workdayStartHour = updateSitterDto.workdayStartHour;
    }
    if (updateSitterDto.workdayEndHour !== undefined) {
      sitterFields.workdayEndHour = updateSitterDto.workdayEndHour;
    }

    // Convert availability strings to Date objects if provided
    if (
      updateSitterDto.availability &&
      Array.isArray(updateSitterDto.availability)
    ) {
      sitterFields.availability = updateSitterDto.availability.map(
        (date: any) => {
          if (typeof date === 'string') {
            return new Date(date);
          }
          return date instanceof Date ? date : new Date(date);
        },
      );
    }

    // Update user fields if any
    if (Object.keys(userFields).length > 0) {
      await this.userModel.findByIdAndUpdate(id, { $set: userFields }).exec();
    }

    // Update sitter fields if any
    const sitter = await this.petSitterModel
      .findOneAndUpdate({ user: id }, { $set: sitterFields }, { new: true })
      .populate('user')
      .exec();

    if (!sitter) {
      throw new NotFoundException(`Pet sitter with ID ${id} not found`);
    }
    const user = sitter.user as unknown as UserDocument;
    if (!user || !('_id' in user)) {
      throw new NotFoundException('User not populated correctly');
    }
    // Merge all sitter fields into User document for client consumption
    (user as any).sitterAddress = sitter.sitterAddress;
    (user as any).hourlyRate = sitter.hourlyRate;
    (user as any).services = sitter.services;
    (user as any).yearsOfExperience = sitter.yearsOfExperience;
    (user as any).availableWeekends = sitter.availableWeekends;
    (user as any).canHostPets = sitter.canHostPets;
    (user as any).availability = sitter.availability;
    (user as any).bio = sitter.bio;
    (user as any).workdayStartHour = sitter.workdayStartHour;
    (user as any).workdayEndHour = sitter.workdayEndHour;
    (user as any).latitude = sitter.latitude;
    (user as any).longitude = sitter.longitude;
    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.petSitterModel
      .findOneAndDelete({ user: id })
      .exec();

    if (!result) {
      throw new NotFoundException(`Pet sitter with ID ${id} not found`);
    }

    // Also update user role back to 'owner'
    await this.userModel
      .findByIdAndUpdate(id, { $set: { role: 'owner' } })
      .exec();
  }

  // Convert existing user to pet sitter (when they complete the join form)
  async convertUserToSitter(
    userId: string,
    sitterData: Omit<CreateSitterDto, 'email' | 'name' | 'password'>,
  ): Promise<UserDocument> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Convert availability strings to Date objects if provided
    let availabilityDates: Date[] | undefined;
    if (sitterData.availability && Array.isArray(sitterData.availability)) {
      availabilityDates = sitterData.availability.map((date: any) => {
        if (typeof date === 'string') {
          return new Date(date);
        }
        return date instanceof Date ? date : new Date(date);
      });
    }

    // Check if pet sitter record already exists
    let petSitter = await this.petSitterModel.findOne({ user: userId }).exec();

    if (petSitter) {
      // Already a sitter, just update the fields
      // Convert to UpdateSitterDto format
      const updateData: UpdateSitterDto = {
        hourlyRate: sitterData.hourlyRate,
        sitterAddress: sitterData.sitterAddress,
        services: sitterData.services,
        yearsOfExperience: sitterData.yearsOfExperience,
        availableWeekends: sitterData.availableWeekends,
        canHostPets: sitterData.canHostPets,
        availability: availabilityDates,
        latitude: sitterData.latitude,
        longitude: sitterData.longitude,
        bio: sitterData.bio,
        workdayStartHour: sitterData.workdayStartHour,
        workdayEndHour: sitterData.workdayEndHour,
      };
      return this.update(userId, updateData);
    } else {
      // Create new pet sitter record in pet-sitters collection
      const sitterRecord = new this.petSitterModel({
        user: userId,
        hourlyRate: sitterData.hourlyRate,
        sitterAddress: sitterData.sitterAddress,
        services: sitterData.services || [],
        yearsOfExperience: sitterData.yearsOfExperience,
        availableWeekends: sitterData.availableWeekends ?? false,
        canHostPets: sitterData.canHostPets ?? false,
        availability: availabilityDates || [],
        latitude: sitterData.latitude,
        longitude: sitterData.longitude,
        bio: sitterData.bio,
        workdayStartHour: sitterData.workdayStartHour ?? 8,
        workdayEndHour: sitterData.workdayEndHour ?? 18,
      });

      petSitter = await sitterRecord.save();
      await petSitter.populate('user');

      // Update user role to 'sitter' - keep existing verification status
      await this.userModel
        .findByIdAndUpdate(userId, {
          $set: {
            role: 'sitter',
          },
        })
        .exec();

      console.log(
        `[Sitter Conversion] User ${userId} converted to sitter role`,
      );
    }

    // Return the user with updated role
    const updatedUser = await this.usersService.findOne(userId);
    return updatedUser;
  }
}
