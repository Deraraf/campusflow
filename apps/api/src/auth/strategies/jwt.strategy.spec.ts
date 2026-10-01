import { UnauthorizedException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { UsersService } from '../../users/users.service.js';
import { JwtStrategy } from './jwt.strategy.js';

const activeUser = {
  id: 'user-id',
  email: 'student@campusflow.test',
  passwordHash: 'password-hash',
  sessionVersion: 'current-version',
  firstName: 'Campus',
  lastName: 'User',
  role: 'STUDENT' as const,
  status: 'ACTIVE' as const,
  emailVerifiedAt: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function createStrategy() {
  vi.stubEnv('JWT_SECRET', 'unit-test-secret');
  const usersService = {
    findOneForAuth: vi.fn().mockResolvedValue(activeUser),
  } as unknown as UsersService;

  return new JwtStrategy(usersService);
}

describe('JwtStrategy', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('rejects JWTs issued with a previous session version', async () => {
    const strategy = createStrategy();

    await expect(
      strategy.validate({
        sub: activeUser.id,
        email: activeUser.email,
        role: activeUser.role,
        sessionVersion: 'previous-version',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('returns the public user without password or session data', async () => {
    const strategy = createStrategy();

    const user = await strategy.validate({
      sub: activeUser.id,
      email: activeUser.email,
      role: activeUser.role,
      sessionVersion: activeUser.sessionVersion,
    });

    expect(user).not.toHaveProperty('passwordHash');
    expect(user).not.toHaveProperty('sessionVersion');
  });
});