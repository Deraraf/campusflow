import 'reflect-metadata';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { ROLES_KEY } from '../../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../../auth/guards/roles.guard.js';
import { StudentApplicationsController } from './student-applications.controller.js';
import { StudentsController } from '../students/students.controller.js';
import { StudentAcademicStandingsController } from '../student-academic-standings/student-academic-standings.controller.js';

function createContext(
  handler: object,
  controller: new (...args: never[]) => unknown,
  user?: { role: 'ADMIN' | 'INSTRUCTOR' | 'STUDENT' },
) {
  return {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({
      getRequest: () => (user === undefined ? {} : { user }),
    }),
  } as unknown as ExecutionContext;
}

describe('Student admission authorization', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  it.each([
    [
      StudentApplicationsController,
      StudentApplicationsController.prototype.create,
      'STUDENT',
    ],
    [
      StudentApplicationsController,
      StudentApplicationsController.prototype.review,
      'ADMIN',
    ],
    [
      StudentApplicationsController,
      StudentApplicationsController.prototype.approve,
      'ADMIN',
    ],
    [StudentsController, StudentsController.prototype.getMine, 'STUDENT'],
    [StudentsController, StudentsController.prototype.list, 'ADMIN'],
    [
      StudentAcademicStandingsController,
      StudentAcademicStandingsController.prototype.create,
      'ADMIN',
    ],
  ])('requires %s for the endpoint', (controller, handler, role) => {
    expect(
      reflector.getAllAndOverride(ROLES_KEY, [handler, controller]),
    ).toEqual([role]);
  });

  it('rejects a non-student from the applicant endpoint', () => {
    expect(() =>
      guard.canActivate(
        createContext(
          StudentApplicationsController.prototype.create,
          StudentApplicationsController,
          { role: 'INSTRUCTOR' },
        ),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects an unauthenticated request', () => {
    expect(() =>
      guard.canActivate(
        createContext(StudentsController.prototype.getMine, StudentsController),
      ),
    ).toThrow(UnauthorizedException);
  });
});
