// src/modules/pets/pets.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Pet, PetDocument } from './schemas/pet.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import {
  MedicalHistory,
  MedicalHistoryDocument,
} from './schemas/medical-history.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AiService } from '../ai/ai.service';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';

@Injectable()
export class PetsService {
  constructor(
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(MedicalHistory.name)
    private medicalHistoryModel: Model<MedicalHistoryDocument>,
    @InjectModel(Booking.name)
    private bookingModel: Model<BookingDocument>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly aiService: AiService,
  ) {}

  async create(
    ownerId: string,
    createPetDto: CreatePetDto,
    file?: any,
  ): Promise<Pet> {
    try {
      const owner = await this.userModel.findById(ownerId);
      if (!owner) throw new NotFoundException('Owner not found');

      const { medicalHistory, photo: photoBase64, ...petData } = createPetDto;

      // Handle photo upload - can be from file (multipart) or base64 string (JSON)
      // Store photo directly as base64 string (Cloudinary upload bypassed).
      // The base64 string is stored in MongoDB and decoded on the client.
      let photoUrl: string | undefined;

      if (file) {
        // Convert multipart file buffer to base64
        photoUrl = `data:image/jpeg;base64,${file.buffer.toString('base64')}`;
      } else if (photoBase64 && typeof photoBase64 === 'string') {
        // Store base64 string as-is (already in correct format)
        photoUrl = photoBase64;
      }

      const pet = await this.petModel.create({
        ...petData,
        photo: photoUrl,
        owner: new Types.ObjectId(ownerId),
      });

      owner.pets.push(pet._id);
      await owner.save();

      const history = await this.medicalHistoryModel.create({
        ...(medicalHistory ?? {}),
        pet: pet._id,
      });

      pet.medicalHistory = history._id;
      await pet.save();

      return this.findOne(pet._id.toHexString());
    } catch (error) {
      console.error('Error creating pet:', error);
      throw error;
    }
  }

  async findAllByOwner(ownerId: string): Promise<Pet[]> {
    return this.petModel
      .find({ owner: new Types.ObjectId(ownerId) })
      .populate('owner', 'name email')
      .populate('medicalHistory');
  }

  async findOne(petId: string): Promise<Pet> {
    const pet = await this.petModel
      .findById(petId)
      .populate('owner', 'name email')
      .populate('medicalHistory');
    if (!pet) throw new NotFoundException('Pet not found');
    return pet;
  }

  async update(
    petId: string,
    updatePetDto: UpdatePetDto,
    file?: any,
  ): Promise<Pet> {
    try {
      const {
        medicalHistory,
        photo: photoBase64,
        ...petUpdates
      } = updatePetDto;

      const pet = await this.petModel.findById(petId);
      if (!pet) throw new NotFoundException('Pet not found');

      // Store photo directly as base64 (Cloudinary upload bypassed).
      if (file) {
        pet.photo = `data:image/jpeg;base64,${file.buffer.toString('base64')}`;
      } else if (photoBase64 && typeof photoBase64 === 'string') {
        pet.photo = photoBase64;
      }

      const petUpdateEntries = Object.entries(petUpdates).filter(
        ([, value]) => value !== undefined,
      );

      // Apply field updates
      if (petUpdateEntries.length > 0) {
        petUpdateEntries.forEach(([key, value]) => {
          (pet as unknown as Record<string, unknown>)[key] = value;
        });
      }

      // Always save if any field changed OR if a new photo was uploaded.
      // Without this guard, uploading a photo with no other fields changed
      // would set pet.photo in memory but never persist it to MongoDB.
      if (
        petUpdateEntries.length > 0 ||
        file ||
        (photoBase64 && typeof photoBase64 === 'string')
      ) {
        await pet.save();
      }

      if (medicalHistory) {
        const medicalHistoryUpdate: Record<string, unknown> = {};

        if (medicalHistory.vaccinations !== undefined) {
          medicalHistoryUpdate.vaccinations = medicalHistory.vaccinations;
        }

        if (medicalHistory.chronicConditions !== undefined) {
          medicalHistoryUpdate.chronicConditions =
            medicalHistory.chronicConditions;
        }

        if (medicalHistory.currentMedications !== undefined) {
          medicalHistoryUpdate.currentMedications =
            medicalHistory.currentMedications;
        }

        if (Object.keys(medicalHistoryUpdate).length > 0) {
          const updatedHistory =
            await this.medicalHistoryModel.findOneAndUpdate(
              { pet: pet._id },
              { ...medicalHistoryUpdate, pet: pet._id },
              {
                new: true,
                upsert: true,
                setDefaultsOnInsert: true,
              },
            );

          if (!pet.medicalHistory) {
            pet.medicalHistory = updatedHistory._id;
            await pet.save();
          }
        }
      }

      // Pet facts changed, so no previously generated AI response is valid.
      this.aiService.clearCacheForPet(petId);

      return this.findOne(petId);
    } catch (error) {
      console.error('Error updating pet:', error);
      throw error;
    }
  }

  async delete(petId: string, ownerId: string): Promise<void> {
    const pet = await this.petModel.findOneAndDelete({
      _id: new Types.ObjectId(petId),
      owner: new Types.ObjectId(ownerId),
    });
    if (!pet) throw new NotFoundException('Pet not found or not yours');

    // Delete pet photo from Cloudinary if exists
    if (pet.photo) {
      const publicId = this.extractPublicId(pet.photo);
      if (publicId) {
        await this.cloudinaryService.deleteImage(publicId);
      }
    }

    await this.userModel.findByIdAndUpdate(new Types.ObjectId(ownerId), {
      $pull: { pets: new Types.ObjectId(petId) },
    });

    await this.medicalHistoryModel.findOneAndDelete({ pet: pet._id });

    // A booking cannot remain valid after its pet has been deleted. Removing
    // these server-side guarantees the cascade even when a client has a stale
    // or incomplete local booking list.
    await this.bookingModel.deleteMany({ pet: pet._id });

    this.aiService.clearCacheForPet(petId);
  }

  private extractPublicId(imageUrl: string): string | null {
    // Cloudinary URL format:
    // https://res.cloudinary.com/<cloud>/image/upload/v<version>/<folder>/<name>.<ext>
    // Public ID = everything after /upload/v<version>/ (or /upload/) without the extension
    const uploadIndex = imageUrl.indexOf('/upload/');
    if (uploadIndex === -1) return null;
    // Skip '/upload/' and optional version segment 'v123456/'
    let afterUpload = imageUrl.substring(uploadIndex + 8);
    afterUpload = afterUpload.replace(/^v\d+\//, '');
    // Remove file extension
    const dotIndex = afterUpload.lastIndexOf('.');
    return dotIndex !== -1 ? afterUpload.substring(0, dotIndex) : afterUpload;
  }
}
