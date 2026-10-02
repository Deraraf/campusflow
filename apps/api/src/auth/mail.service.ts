import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private resendClient: Resend | null = null;

  private getResendClient(): Resend {
    if (this.resendClient) {
      return this.resendClient;
    }

    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY is missing.');
      throw new Error('Resend email configuration is missing.');
    }

    this.resendClient = new Resend(apiKey);
    return this.resendClient;
  }

  private async sendEmail(
    email: string,
    subject: string,
    text: string,
    html: string,
    emailType: 'verification' | 'password reset',
  ): Promise<void> {
    const from = process.env.MAIL_FROM;

    if (!from) {
      throw new Error('MAIL_FROM must be configured for email delivery.');
    }

    try {
      const { error } = await this.getResendClient().emails.send({
        from,
        to: email,
        subject,
        text,
        html,
      });

      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      this.logger.error(`Failed to send ${emailType} email`, error);
      throw error;
    }
  }

  async sendVerificationEmail(
    email: string,
    verificationUrl: string,
    _userId: string,
  ): Promise<void> {
    return this.sendEmail(
      email,
      'Verify your CampusFlow account',
      [
          'Welcome to CampusFlow.',
          '',
          'Please verify your email address by opening the link below:',
          verificationUrl,
          '',
          'This verification link expires in 24 hours.',
          '',
          'If you did not create a CampusFlow account, you can ignore this email.',
      ].join('\n'),
      `
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
      'verification',
    );
  }

  async sendPasswordResetEmail(
    email: string,
    resetUrl: string,
    _userId: string,
  ): Promise<void> {
    return this.sendEmail(
      email,
      'Reset your CampusFlow password',
      [
          'We received a request to reset your CampusFlow password.',
          '',
          'Open the link below to choose a new password:',
          resetUrl,
          '',
          'This reset link expires in 1 hour.',
          '',
          'If you did not request a password reset, you can ignore this email.',
      ].join('\n'),
      `
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
      'password reset',
    );
  }
}
