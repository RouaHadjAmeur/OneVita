// src/modules/users/users.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const createdUser = new this.userModel({
      ...createUserDto,
      balance: createUserDto.balance ?? 0,
      isVerified: createUserDto.isVerified ?? false,
    });
    return createdUser.save();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().exec();
  }

  async findOne(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(id, updateUserDto, { new: true })
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async remove(id: string): Promise<UserDocument> {
    const user = await this.userModel.findByIdAndDelete(id).exec();
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async updateRefreshToken(userId: string, refreshToken: string | null) {
    const user = await this.userModel
      .findByIdAndUpdate(
        userId,
        { hashedRefreshToken: refreshToken },
        { new: true },
      )
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(
    userId: string,
    update: Partial<{
      name?: string;
      phoneNumber?: string;
      country?: string;
      city?: string;
      latitude?: number;
      longitude?: number;
      hasPhoto?: boolean;
      hasPets?: boolean;
    }>,
    file?: any,
  ): Promise<UserDocument> {
    try {
      const payload: Record<string, unknown> = {};

      if (update.name !== undefined) payload.name = update.name;
      if (update.phoneNumber !== undefined)
        payload.phoneNumber = update.phoneNumber;
      if (update.country !== undefined) payload.country = update.country;
      if (update.city !== undefined) payload.city = update.city;
      if (update.latitude !== undefined) payload.latitude = update.latitude;
      if (update.longitude !== undefined) payload.longitude = update.longitude;
      if (update.hasPhoto !== undefined) payload.hasPhoto = update.hasPhoto;
      if (update.hasPets !== undefined) payload.hasPets = update.hasPets;

      // Handle image upload if file is provided
      if (file) {
        const user = await this.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        // Delete old image if exists
        if (user.profileImage) {
          const publicId = this.extractPublicId(user.profileImage);
          if (publicId) {
            try {
              await this.cloudinaryService.deleteImage(publicId);
            } catch (error) {
              console.error('Error deleting old profile image:', error);
              // Continue with upload even if deletion fails
            }
          }
        }

        // Store photo directly as base64 string (Cloudinary upload bypassed).
        try {
          const photoUrl = `data:image/jpeg;base64,${file.buffer.toString('base64')}`;
          payload.profileImage = photoUrl;
          payload.hasPhoto = true;
        } catch (error) {
          console.error('Base64 conversion error:', error);
          throw new Error(
            `Failed to process profile image: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
        }
      }

      const user = await this.userModel
        .findByIdAndUpdate(userId, payload, { new: true })
        .exec();

      if (!user) throw new NotFoundException('User not found');
      return user;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  private extractPublicId(imageUrl: string): string | null {
    const matches = imageUrl.match(/\/([^/]+)\.(jpg|jpeg|png|gif|webp)$/i);
    return matches ? matches[1] : null;
  }

  async updateFcmToken(
    userId: string,
    fcmToken: string | null,
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findByIdAndUpdate(userId, { fcmToken }, { new: true })
      .exec();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getFcmToken(userId: string): Promise<string | null> {
    const user = await this.userModel
      .findById(userId)
      .select('fcmToken')
      .exec();
    return user?.fcmToken || null;
  }
}
