import { AuthService, Tokens } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangeEmailDto } from './dto/change-email.dto';
import { VerifyNewEmailDto } from './dto/verify-new-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Request } from 'express';
import { User } from '../users/schemas/user.schema';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { FcmService } from '../fcm/fcm.service';
export declare class AuthController {
    private readonly authService;
    private readonly fcmService;
    constructor(authService: AuthService, fcmService: FcmService);
    register(registerDto: RegisterDto): Promise<{
        message: string;
    }>;
    login(loginDto: LoginDto): Promise<{
        user: Partial<import("../users/schemas/user.schema").UserDocument>;
        tokens: Tokens;
    }>;
    refresh(req: Request & {
        user: {
            sub: string;
        };
        body: {
            refreshToken: string;
        };
    }): Promise<Tokens>;
    logout(req: Request & {
        user: {
            sub: string;
        };
    }): Promise<{
        message: string;
    }>;
    verifyEmail(verifyDto: VerifyEmailDto): Promise<{
        message: string;
    }>;
    resendVerification(body: {
        email: string;
    }): Promise<{
        message: string;
    }>;
    forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<{
        message: string;
    }>;
    resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{
        message: string;
    }>;
    getProfile(user: User): Promise<Partial<import("../users/schemas/user.schema").UserDocument> & {
        subscription?: any;
    }>;
    getFirebaseToken(user: User): Promise<{
        token: string;
    }>;
    checkEmailExists(req: Request): Promise<{
        exists: boolean;
    }>;
    google(dto: GoogleLoginDto): Promise<{
        user: {
            id: any;
            email: any;
            name: any;
            profileImage: any;
            isVerified: any;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    apple(dto: AppleLoginDto): Promise<{
        user: {
            id: any;
            email: any;
            name: any;
            isVerified: any;
        };
        tokens: {
            accessToken: string;
            refreshToken: string;
        };
    }>;
    changeEmail(user: User, changeEmailDto: ChangeEmailDto): Promise<{
        message: string;
    }>;
    verifyNewEmail(user: User, verifyDto: VerifyNewEmailDto): Promise<{
        message: string;
    }>;
    changePassword(user: User, changePasswordDto: ChangePasswordDto): Promise<{
        message: string;
    }>;
}
