// src/mail/mail.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendVerificationCode(email: string, code: string): Promise<void> {
    const from = process.env.MAIL_FROM;
    if (!from) {
      throw new Error('MAIL_FROM is not defined');
    }

    try {
      await this.transporter.sendMail({
        from,
        to: email,
        subject: 'Verify your email address',
        html: `
          <h2>Your verification code</h2>
          <p>Use this code to verify your email:</p>
          <h1 style="font-size: 32px; letter-spacing: 4px;">${code}</h1>
          <p>This code will expire in 10 minutes.</p>
        `,
      });
      console.log(`Verification email sent to ${email}`);
    } catch (err) {
      console.error('Failed to send verification email:', err);
      throw new InternalServerErrorException(
        'Could not send verification email. Please try again later.',
      );
    }
  }
}
