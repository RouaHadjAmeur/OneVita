import { VeterinariansService } from './veterinarians.service';
import { CreateVetDto } from './dto/create-vet.dto';
import { UpdateVetDto } from './dto/update-vet.dto';
import { User } from '../users/schemas/user.schema';
export declare class VeterinariansController {
    private readonly veterinariansService;
    constructor(veterinariansService: VeterinariansService);
    create(createVetDto: CreateVetDto): Promise<User>;
    findAll(excludeUserId?: string): Promise<User[]>;
    findOne(id: string): Promise<User>;
    update(id: string, updateVetDto: UpdateVetDto): Promise<User>;
    remove(id: string): Promise<void>;
    convertUserToVet(userId: string, currentUser: User, vetData: Omit<CreateVetDto, 'email' | 'name' | 'password'>): Promise<User>;
}
