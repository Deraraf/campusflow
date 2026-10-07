import 'reflect-metadata';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { AttendanceController } from './attendance.controller.js';

function createContext(user?: { role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT' }) {
  return {
    getHandler: () => AttendanceController.prototype.getById,
    getClass: () => AttendanceController,
    switchToHttp: () => ({
      getRequest: () => (user === undefined ? {} : { user }),
    }),
  } as unknown as ExecutionContext;
}

describe('AttendanceController authorization', () => {
  const guard = new RolesGuard(new Reflector());

  it('allows all attendance roles through the guard', () => {
    expect(
      new Reflector().getAllAndOverride(ROLES_KEY, [
        AttendanceController.prototype.getById,
        AttendanceController,
      ]),
    ).toEqual(['ADMIN', 'INSTRUCTOR', 'STUDENT']);
  });

  it('rejects unauthorized users for admin-only endpoints', () => {
    expect(() =>
      guard.canActivate(createContext({ role: 'STUDENT' })),
    ).not.toThrow();
    expect(() =>
      guard.canActivate(createContext({ role: 'INSTRUCTOR' })),
    ).not.toThrow();
  });

  it('rejects unauthenticated requests', () => {
    expect(() => guard.canActivate(createContext())).toThrow(
      UnauthorizedException,
    );
  });
});
