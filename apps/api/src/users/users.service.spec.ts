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

  it('updates the password only after atomically consuming a valid reset token', async () => {
    const token = {
      id: 'reset-token-id',
      userId: 'user-id',
      tokenHash: 'token-hash',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: null,
      createdAt: new Date().toISOString(),
    };
    const tokenUpdate = vi.fn().mockResolvedValue({ ...token, usedAt: 'now' });
    const userUpdate = vi.fn().mockResolvedValue({ id: token.userId });
    const passwordResetTokenTable = {
      where: vi.fn(() => ({
        all: () => ({ first: async () => token }),
        update: tokenUpdate,
      })),
    };
    const userTable = {
      where: vi.fn(() => ({ update: userUpdate })),
    };
    const transactionContext = {
      orm: {
        public: {
          PasswordResetToken: passwordResetTokenTable,
          User: userTable,
        },
      },
    };
    const transaction = vi.fn(
      async (callback: (tx: typeof transactionContext) => Promise<boolean>) =>
        callback(transactionContext),
    );
    const database = {
      client: { transaction },
    } as unknown as DatabaseService;
    const usersService = new UsersService(database);

    await expect(
      usersService.resetPasswordWithToken({
        tokenId: token.id,
        userId: token.userId,
        passwordHash: 'new-password-hash',
      }),
    ).resolves.toBe(true);

    expect(transaction).toHaveBeenCalledOnce();
    expect(tokenUpdate).toHaveBeenCalledWith({ usedAt: expect.any(String) });
    expect(userUpdate).toHaveBeenCalledWith({
      passwordHash: 'new-password-hash',
      sessionVersion: expect.any(String),
    });
    expect(tokenUpdate.mock.invocationCallOrder[0]).toBeLessThan(
      userUpdate.mock.invocationCallOrder[0]!,
    );
  });

  it('does not update the password when another request already consumed the token', async () => {
    const token = {
      id: 'reset-token-id',
      userId: 'user-id',
      tokenHash: 'token-hash',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      usedAt: null,
      createdAt: new Date().toISOString(),
    };
    const userUpdate = vi.fn();
    const transactionContext = {
      orm: {
        public: {
          PasswordResetToken: {
            where: vi.fn(() => ({
              all: () => ({ first: async () => token }),
              update: async () => null,
            })),
          },
          User: {
            where: vi.fn(() => ({ update: userUpdate })),
          },
        },
      },
    };
    const database = {
      client: {
        transaction: async (
          callback: (tx: typeof transactionContext) => Promise<boolean>,
        ) => callback(transactionContext),
      },
    } as unknown as DatabaseService;
    const usersService = new UsersService(database);

    await expect(
      usersService.resetPasswordWithToken({
        tokenId: token.id,
        userId: token.userId,
        passwordHash: 'new-password-hash',
      }),
    ).resolves.toBe(false);
    expect(userUpdate).not.toHaveBeenCalled();
  });
});