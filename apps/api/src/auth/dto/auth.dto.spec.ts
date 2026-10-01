import { describe, expect, it } from 'vitest';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { RegisterDto } from './register.dto.js';
import { LoginDto } from './login.dto.js';
import { VerifyEmailDto } from './verify-email.dto.js';
import { ForgotPasswordDto } from './forgot-password.dto.js';
import { ResetPasswordDto } from './reset-password.dto.js';

describe('Auth DTO Validation', () => {
  describe('RegisterDto', () => {
    it('validates and normalizes valid registration input', async () => {
      const input = {
        firstName: '  Derara  ',
        lastName: '  Geremu ',
        email: '  STUDENT@CampusFlow.EDU  ',
        password: 'securePassword123',
      };

      const dto = plainToInstance(RegisterDto, input);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.firstName).toBe('Derara');
      expect(dto.lastName).toBe('Geremu');
      expect(dto.email).toBe('student@campusflow.edu');
      expect(dto.password).toBe('securePassword123');
    });

    it('rejects passwords shorter than 8 characters and invalid emails', async () => {
      const input = {
        firstName: '',
        lastName: '',
        email: 'not-an-email',
        password: 'short',
      };

      const dto = plainToInstance(RegisterDto, input);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const errorProperties = errors.map((e) => e.property);
      expect(errorProperties).toContain('firstName');
      expect(errorProperties).toContain('lastName');
      expect(errorProperties).toContain('email');
      expect(errorProperties).toContain('password');
    });
  });

  describe('LoginDto', () => {
    it('validates and normalizes login email', async () => {
      const input = {
        email: '  Admin@CampusFlow.EDU  ',
        password: 'anyPassword',
      };

      const dto = plainToInstance(LoginDto, input);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('admin@campusflow.edu');
    });

    it('rejects invalid email on login', async () => {
      const input = {
        email: 'invalid-email',
        password: '',
      };

      const dto = plainToInstance(LoginDto, input);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const errorProperties = errors.map((e) => e.property);
      expect(errorProperties).toContain('email');
      expect(errorProperties).toContain('password');
    });
  });

  describe('VerifyEmailDto', () => {
    it('rejects empty verification token', async () => {
      const input = { token: '   ' };
      const dto = plainToInstance(VerifyEmailDto, input);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      expect(errors[0]?.property).toBe('token');
    });
  });

  describe('ForgotPasswordDto', () => {
    it('normalizes email and accepts valid reset requests', async () => {
      const input = { email: '  Student@CampusFlow.EDU  ' };
      const dto = plainToInstance(ForgotPasswordDto, input);
      const errors = await validate(dto);

      expect(errors).toHaveLength(0);
      expect(dto.email).toBe('student@campusflow.edu');
    });
  });

  describe('ResetPasswordDto', () => {
    it('requires a token and enforces a long enough password', async () => {
      const input = { token: '   ', password: 'short' };
      const dto = plainToInstance(ResetPasswordDto, input);
      const errors = await validate(dto);

      expect(errors.length).toBeGreaterThan(0);
      const errorProperties = errors.map((e) => e.property);
      expect(errorProperties).toContain('token');
      expect(errorProperties).toContain('password');
    });
  });
});
