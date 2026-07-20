import { Model } from 'mongoose';
import { Pet, PetDocument } from './schemas/pet.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { CreatePetDto } from './dto/create-pet.dto';
import { UpdatePetDto } from './dto/update-pet.dto';
import { MedicalHistoryDocument } from './schemas/medical-history.schema';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { AiService } from '../ai/ai.service';
import { BookingDocument } from '../bookings/schemas/booking.schema';
export declare class PetsService {
    private petModel;
    private userModel;
    private medicalHistoryModel;
    private bookingModel;
    private readonly cloudinaryService;
    private readonly aiService;
    constructor(petModel: Model<PetDocument>, userModel: Model<UserDocument>, medicalHistoryModel: Model<MedicalHistoryDocument>, bookingModel: Model<BookingDocument>, cloudinaryService: CloudinaryService, aiService: AiService);
    create(ownerId: string, createPetDto: CreatePetDto, file?: any): Promise<Pet>;
    findAllByOwner(ownerId: string): Promise<Pet[]>;
    findOne(petId: string): Promise<Pet>;
    update(petId: string, updatePetDto: UpdatePetDto, file?: any): Promise<Pet>;
    delete(petId: string, ownerId: string): Promise<void>;
    private extractPublicId;
}
