export declare class MailService {
    private transporter;
    constructor();
    sendVerificationCode(email: string, code: string): Promise<void>;
}
