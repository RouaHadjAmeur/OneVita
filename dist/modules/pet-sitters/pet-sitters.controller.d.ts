import { PetSittersService } from './pet-sitters.service';
import { CreateSitterDto } from './dto/create-sitter.dto';
import { UpdateSitterDto } from './dto/update-sitter.dto';
import { User } from '../users/schemas/user.schema';
export declare class PetSittersController {
    private readonly petSittersService;
    constructor(petSittersService: PetSittersService);
    create(createSitterDto: CreateSitterDto): Promise<User>;
    findAll(excludeUserId?: string, latitude?: string, longitude?: string): Promise<User[]>;
    findOne(id: string): Promise<User>;
    update(id: string, currentUser: User, updateSitterDto: UpdateSitterDto): Promise<User>;
    remove(id: string): Promise<void>;
    convertUserToSitter(userId: string, currentUser: User, sitterData: Omit<CreateSitterDto, 'email' | 'name' | 'password'>): Promise<User>;
}
