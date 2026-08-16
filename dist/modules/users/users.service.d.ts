import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
export declare class UsersService {
    private readonly userModel;
    private readonly cloudinaryService;
    constructor(userModel: Model<UserDocument>, cloudinaryService: CloudinaryService);
    create(createUserDto: CreateUserDto): Promise<UserDocument>;
    findAll(): Promise<UserDocument[]>;
    findOne(id: string): Promise<UserDocument>;
    update(id: string, updateUserDto: UpdateUserDto): Promise<UserDocument>;
    remove(id: string): Promise<UserDocument>;
    findById(id: string): Promise<UserDocument | null>;
    findByEmail(email: string): Promise<UserDocument | null>;
    updateRefreshToken(userId: string, refreshToken: string | null): Promise<import("mongoose").Document<unknown, {}, UserDocument, {}, {}> & User & import("mongoose").Document<unknown, any, any, Record<string, any>, {}> & Required<{
        _id: import("mongoose").Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateProfile(userId: string, update: Partial<{
        name?: string;
        phoneNumber?: string;
        country?: string;
        city?: string;
        latitude?: number;
        longitude?: number;
        hasPhoto?: boolean;
        hasPets?: boolean;
    }>, file?: any): Promise<UserDocument>;
    private extractPublicId;
    updateFcmToken(userId: string, fcmToken: string | null): Promise<UserDocument>;
    getFcmToken(userId: string): Promise<string | null>;
}
