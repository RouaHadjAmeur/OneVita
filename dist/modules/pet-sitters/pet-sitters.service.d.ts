import { Model } from 'mongoose';
import { CreateSitterDto } from './dto/create-sitter.dto';
import { UpdateSitterDto } from './dto/update-sitter.dto';
import { UsersService } from '../users/users.service';
import { UserDocument } from '../users/schemas/user.schema';
import { PetSitterDocument } from './schemas/pet-sitter.schema';
import { MailService } from '../mail/mail.service';
export declare class PetSittersService {
    private readonly userModel;
    private readonly petSitterModel;
    private readonly usersService;
    private readonly mailService;
    constructor(userModel: Model<UserDocument>, petSitterModel: Model<PetSitterDocument>, usersService: UsersService, mailService: MailService);
    create(createSitterDto: CreateSitterDto): Promise<UserDocument>;
    findAll(excludeUserId?: string): Promise<UserDocument[]>;
    findOne(id: string): Promise<UserDocument>;
    findByEmail(email: string): Promise<UserDocument | null>;
    update(id: string, updateSitterDto: UpdateSitterDto): Promise<UserDocument>;
    remove(id: string): Promise<void>;
    convertUserToSitter(userId: string, sitterData: Omit<CreateSitterDto, 'email' | 'name' | 'password'>): Promise<UserDocument>;
}
