import { describe, expect, it, vi } from 'vitest';
import { DatabaseService } from '../database/database.service.js';
import { UsersService } from './users.service.js';

function createTokenTable(rows: Record<string, unknown>[]) {
  return {
    where: vi.fn((criteria: Record<string, unknown>) => ({
      all: () => ({
        first: async () =>
          rows.find((row) =>
            Object.entries(criteria).every(([key, value]) => row[key] === value),
          ) ?? null,
      }),
    })),
  };
}

describe('UsersService auth token storage', () => {
  it('does not accept an email verification token as a password reset token', async () => {
    const verificationToken = {
      id: 'verification-token-id',
      userId: 'user-id',
      tokenHash: 'same-token-hash',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: null,
      createdAt: new Date().toISOString(),
    };
    const emailVerificationTokenTable = createTokenTable([verificationToken]);
    const passwordResetTokenTable = createTokenTable([]);
    const database = {
      client: {
        orm: {
          public: {
            EmailVerificationToken: emailVerificationTokenTable,
            PasswordResetToken: passwordResetTokenTable,
          },
        },
      },
    } as unknown as DatabaseService;
    const usersService = new UsersService(database);

    await expect(
      usersService.findPasswordResetToken(verificationToken.tokenHash as string),
    ).resolves.toBeNull();
    expect(passwordResetTokenTable.where).toHaveBeenCalledWith({
      tokenHash: verificationToken.tokenHash,
    });
    expect(emailVerificationTokenTable.where).not.toHaveBeenCalled();
  });
});