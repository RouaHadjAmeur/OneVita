// src/modules/veterinarians/veterinarians.service.ts

import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateVetDto } from './dto/create-vet.dto';
import { UpdateVetDto } from './dto/update-vet.dto';
import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import {
  Veterinarian,
  VeterinarianDocument,
} from './schemas/veterinarian.schema';
import { MailService } from '../mail/mail.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class VeterinariansService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(Veterinarian.name)
    private readonly veterinarianModel: Model<VeterinarianDocument>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Uploads base64-encoded license/clinic images to Cloudinary, if provided.
  private async resolveVetImages(vetData: {
    licenseImageBase64?: string;
    clinicImageBase64?: string;
  }): Promise<{ licenseImageUrl?: string; clinicImageUrl?: string }> {
    const result: { licenseImageUrl?: string; clinicImageUrl?: string } = {};

    if (vetData.licenseImageBase64) {
      const uploaded = await this.cloudinaryService.uploadImageFromBase64(
        vetData.licenseImageBase64,
        'veterinarians/licenses',
      );
      result.licenseImageUrl = uploaded.secure_url as string;
    }

    if (vetData.clinicImageBase64) {
      const uploaded = await this.cloudinaryService.uploadImageFromBase64(
        vetData.clinicImageBase64,
        'veterinarians/clinics',
      );
      result.clinicImageUrl = uploaded.secure_url as string;
    }

    return result;
  }

  async create(createVetDto: CreateVetDto): Promise<UserDocument> {
    // Check if user with email already exists
    const existingUser = await this.usersService.findByEmail(
      createVetDto.email,
    );
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(createVetDto.password, 10);

    // Create vet user with role 'vet'
    const vetData = {
      ...createVetDto,
      password: hashedPassword,
      role: 'vet',
      isVerified: false,
      balance: 0,
    };

    const createdUser = await new this.userModel(vetData).save();

    const uploadedImages = await this.resolveVetImages(createVetDto);

    // Create veterinarian record in veterinarians collection
    const veterinarian = new this.veterinarianModel({
      user: createdUser._id,
      licenseNumber: createVetDto.licenseNumber,
      clinicName: createVetDto.clinicName,
      clinicAddress: createVetDto.clinicAddress,
      specializations: createVetDto.specializations || [],
      yearsOfExperience: createVetDto.yearsOfExperience,
      latitude: createVetDto.latitude,
      longitude: createVetDto.longitude,
      bio: createVetDto.bio,
      education: createVetDto.education,
      languages: createVetDto.languages ?? [],
      consultationFee: createVetDto.consultationFee,
      licenseImageUrl: uploadedImages.licenseImageUrl,
      clinicImageUrl: uploadedImages.clinicImageUrl,
    });

    await veterinarian.save();

    return createdUser;
  }

  async findAll(excludeUserId?: string): Promise<UserDocument[]> {
    const filter =
      excludeUserId && Types.ObjectId.isValid(excludeUserId)
        ? { user: { $ne: new Types.ObjectId(excludeUserId) } }
        : {};
    const veterinarians = await this.veterinarianModel
      .find(filter)
      .populate({
        path: 'user',
        match: { role: 'vet', hasActiveSubscription: true },
      })
      .exec();

    return veterinarians.flatMap((vet) => {
      const user = vet.user as unknown as UserDocument | null;
      if (!user || !('_id' in user)) {
        return [];
      }
      // Merge latitude and longitude from Veterinarian into User document
      if (vet.latitude !== undefined) {
        (user as any).latitude = vet.latitude;
      }
      if (vet.longitude !== undefined) {
        (user as any).longitude = vet.longitude;
      }
      this.mergeProfessionalFields(user, vet);
      return [user];
    });
  }

  async findOne(id: string): Promise<UserDocument> {
    const vet = await this.veterinarianModel
      .findOne({ user: id })
      .populate({
        path: 'user',
        match: { role: 'vet', hasActiveSubscription: true },
      })
      .exec();
    if (!vet) {
      throw new NotFoundException(`Veterinarian with ID ${id} not found`);
    }
    const user = vet.user as unknown as UserDocument;
    if (!user || !('_id' in user)) {
      throw new NotFoundException(`Veterinarian with ID ${id} not found`);
    }
    // Merge all vet fields into User document for client consumption
    this.mergeProfessionalFields(user, vet);
    return user;
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    const user = await this.usersService.findByEmail(email);
    if (!user || user.role !== 'vet') {
      return null;
    }
    const vet = await this.veterinarianModel
      .findOne({ user: user._id })
      .populate('user')
      .exec();
    if (!vet) {
      return null;
    }
    const populatedUser = vet.user as unknown as UserDocument;
    return populatedUser && '_id' in populatedUser ? populatedUser : null;
  }

  async update(id: string, updateVetDto: UpdateVetDto): Promise<UserDocument> {
    // Separate user fields from vet fields
    const userFields: any = {};
    const vetFields: any = {};

    // User fields that go to the User model
    if (updateVetDto.phoneNumber !== undefined) {
      userFields.phone = updateVetDto.phoneNumber;
    }
    if (updateVetDto.name !== undefined) {
      userFields.name = updateVetDto.name;
    }
    if (updateVetDto.email !== undefined) {
      userFields.email = updateVetDto.email;
    }

    // Vet fields that go to the Veterinarian model
    if (updateVetDto.licenseNumber !== undefined) {
      vetFields.licenseNumber = updateVetDto.licenseNumber;
    }
    if (updateVetDto.clinicName !== undefined) {
      vetFields.clinicName = updateVetDto.clinicName;
    }
    if (updateVetDto.clinicAddress !== undefined) {
      vetFields.clinicAddress = updateVetDto.clinicAddress;
    }
    if (updateVetDto.specializations !== undefined) {
      vetFields.specializations = updateVetDto.specializations;
    }
    if (updateVetDto.yearsOfExperience !== undefined) {
      vetFields.yearsOfExperience = updateVetDto.yearsOfExperience;
    }
    if (updateVetDto.latitude !== undefined) {
      vetFields.latitude = updateVetDto.latitude;
    }
    if (updateVetDto.longitude !== undefined) {
      vetFields.longitude = updateVetDto.longitude;
    }
    if (updateVetDto.bio !== undefined) {
      vetFields.bio = updateVetDto.bio;
    }
    if (updateVetDto.education !== undefined) {
      vetFields.education = updateVetDto.education;
    }
    if (updateVetDto.languages !== undefined) {
      vetFields.languages = updateVetDto.languages;
    }
    if (updateVetDto.consultationFee !== undefined) {
      vetFields.consultationFee = updateVetDto.consultationFee;
    }

    const uploadedImages = await this.resolveVetImages(updateVetDto);
    if (uploadedImages.licenseImageUrl !== undefined) {
      vetFields.licenseImageUrl = uploadedImages.licenseImageUrl;
    }
    if (uploadedImages.clinicImageUrl !== undefined) {
      vetFields.clinicImageUrl = uploadedImages.clinicImageUrl;
    }

    // Update user fields if any
    if (Object.keys(userFields).length > 0) {
      await this.userModel.findByIdAndUpdate(id, { $set: userFields }).exec();
    }

    // Update vet fields if any
    const vet = await this.veterinarianModel
      .findOneAndUpdate({ user: id }, { $set: vetFields }, { new: true })
      .populate('user')
      .exec();

    if (!vet) {
      throw new NotFoundException(`Veterinarian with ID ${id} not found`);
    }
    const user = vet.user as unknown as UserDocument;
    if (!user || !('_id' in user)) {
      throw new NotFoundException('User not populated correctly');
    }
    // Merge all vet fields into User document for client consumption
    this.mergeProfessionalFields(user, vet);
    return user;
  }

  async remove(id: string): Promise<void> {
    const result = await this.veterinarianModel
      .findOneAndDelete({ user: id })
      .exec();

    if (!result) {
      throw new NotFoundException(`Veterinarian with ID ${id} not found`);
    }

    // Also update user role back to 'owner'
    await this.userModel
      .findByIdAndUpdate(id, { $set: { role: 'owner' } })
      .exec();
  }

  // Convert existing user to vet (when they complete the join form)
  async convertUserToVet(
    userId: string,
    vetData: Omit<CreateVetDto, 'email' | 'name' | 'password'>,
  ): Promise<UserDocument> {
    const user = await this.usersService.findOne(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Check if veterinarian record already exists
    let veterinarian = await this.veterinarianModel
      .findOne({ user: userId })
      .exec();

    const uploadedImages = await this.resolveVetImages(vetData);
    const licenseImageUrl =
      uploadedImages.licenseImageUrl ?? veterinarian?.licenseImageUrl;
    const clinicImageUrl =
      uploadedImages.clinicImageUrl ?? veterinarian?.clinicImageUrl;

    if (veterinarian) {
      // Already a vet, just update the fields
      veterinarian = await this.veterinarianModel
        .findOneAndUpdate(
          { user: userId },
          {
            $set: {
              licenseNumber: vetData.licenseNumber,
              clinicName: vetData.clinicName,
              clinicAddress: vetData.clinicAddress,
              specializations: vetData.specializations || [],
              education: vetData.education,
              languages: vetData.languages || [],
              consultationFee: vetData.consultationFee,
              yearsOfExperience: vetData.yearsOfExperience,
              latitude: vetData.latitude,
              longitude: vetData.longitude,
              bio: vetData.bio,
              licenseImageUrl,
              clinicImageUrl,
            },
          },
          { new: true },
        )
        .populate('user')
        .exec();
    } else {
      // Create new veterinarian record in veterinarians collection
      // Explicitly exclude email field to prevent any issues
      const vetRecordData: any = {
        user: userId,
        licenseNumber: vetData.licenseNumber,
        clinicName: vetData.clinicName,
        clinicAddress: vetData.clinicAddress,
        specializations: vetData.specializations || [],
        education: vetData.education,
        languages: vetData.languages || [],
        consultationFee: vetData.consultationFee,
        yearsOfExperience: vetData.yearsOfExperience,
        latitude: vetData.latitude,
        longitude: vetData.longitude,
        bio: vetData.bio,
        licenseImageUrl,
        clinicImageUrl,
      };

      // Ensure email is not included
      delete vetRecordData.email;

      const vetRecord = new this.veterinarianModel(vetRecordData);

      veterinarian = await vetRecord.save();
      await veterinarian.populate('user');

      // Update user role to 'vet' - keep existing verification status
      await this.userModel
        .findByIdAndUpdate(userId, {
          $set: {
            role: 'vet',
          },
        })
        .exec();

      console.log(`[Vet Conversion] User ${userId} converted to vet role`);
    }

    // Return the user with updated role
    const updatedUser = await this.usersService.findOne(userId);
    if (veterinarian) this.mergeProfessionalFields(updatedUser, veterinarian);
    return updatedUser;
  }

  private mergeProfessionalFields(
    user: UserDocument,
    vet: VeterinarianDocument,
  ): void {
    const target = user as any;
    target.licenseNumber = vet.licenseNumber;
    target.clinicName = vet.clinicName;
    target.clinicAddress = vet.clinicAddress;
    target.specializations = vet.specializations ?? [];
    target.yearsOfExperience = vet.yearsOfExperience;
    target.bio = vet.bio;
    target.education = vet.education;
    target.languages = vet.languages ?? [];
    target.consultationFee = vet.consultationFee;
    target.licenseImageUrl = vet.licenseImageUrl;
    target.clinicImageUrl = vet.clinicImageUrl;
    target.latitude = vet.latitude;
    target.longitude = vet.longitude;

    // Preserve legacy aliases for already released mobile clients.
    target.vetLicenseNumber = vet.licenseNumber;
    target.vetClinicName = vet.clinicName;
    target.vetAddress = vet.clinicAddress;
    target.vetSpecializations = vet.specializations ?? [];
    target.vetYearsOfExperience = vet.yearsOfExperience;
    target.vetBio = vet.bio;
  }
}
