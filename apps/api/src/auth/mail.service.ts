import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT ?? 587);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_PASSWORD?.replace(/\s/g, '');

    if (!host || !user || !password) {
      this.logger.warn('SMTP email configuration is missing or incomplete.');
      throw new Error('SMTP email configuration is missing.');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 30_000,
      auth: {
        user,
        pass: password,
      },
    });

    return this.transporter;
  }

  async sendVerificationEmail(
    email: string,
    verificationUrl: string,
    _userId: string,
  ): Promise<void> {
    const from = process.env.MAIL_FROM ?? process.env.SMTP_USER;

    if (!from) {
      throw new Error(
        'MAIL_FROM or SMTP_USER must be configured for verification emails.',
      );
    }

    const transporter = this.getTransporter();

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: 'Verify your CampusFlow account',

        text: [
          'Welcome to CampusFlow.',
          '',
          'Please verify your email address by opening the link below:',
          verificationUrl,
          '',
          'This verification link expires in 24 hours.',
          '',
          'If you did not create a CampusFlow account, you can ignore this email.',
        ].join('\n'),

        html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #173042;">
        <h2>Welcome to CampusFlow</h2>

        <p>
          Please verify your email address to activate your CampusFlow account.
        </p>

        <p>
          <a
            href="${verificationUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #173042;
              color: #ffffff;
              text-decoration: none;
              font-weight: bold;
            "
          >
            Verify my email
          </a>
        </p>

        <p>
          This verification link expires in 24 hours.
        </p>

        <p>
          If the button does not work, copy and open this link:
        </p>

        <p>
          ${verificationUrl}
        </p>

        <p>
          If you did not create a CampusFlow account, you can ignore this email.
        </p>
      </div>
    `,
      });
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
    _userId: string,
  ): Promise<void> {
    const from = process.env.MAIL_FROM ?? process.env.SMTP_USER;

    if (!from) {
      throw new Error(
        'MAIL_FROM or SMTP_USER must be configured for password reset emails.',
      );
    }

    const transporter = this.getTransporter();

    try {
      await transporter.sendMail({
        from,
        to: email,
        subject: 'Reset your CampusFlow password',
        text: [
          'We received a request to reset your CampusFlow password.',
          '',
          'Open the link below to choose a new password:',
          resetUrl,
          '',
          'This reset link expires in 1 hour.',
          '',
          'If you did not request a password reset, you can ignore this email.',
        ].join('\n'),
        html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #173042;">
        <h2>Reset your CampusFlow password</h2>

        <p>
          We received a request to reset your password. Use the link below to choose a new one.
        </p>

        <p>
          <a
            href="${resetUrl}"
            style="
              display: inline-block;
              padding: 12px 20px;
              background: #173042;
              color: #ffffff;
              text-decoration: none;
              font-weight: bold;
            "
          >
            Reset my password
          </a>
        </p>

        <p>
          This reset link expires in 1 hour.
        </p>

        <p>
          If the button does not work, copy and open this link:
        </p>

        <p>
          ${resetUrl}
        </p>

        <p>
          If you did not request this reset, you can safely ignore this email.
        </p>
      </div>
    `,
      });
    } catch (error) {
      this.logger.error('Failed to send password reset email', error);
      throw error;
    }
  }
}
