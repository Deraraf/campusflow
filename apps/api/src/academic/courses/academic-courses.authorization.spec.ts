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
import { CourseMeetingsController } from '../course-meetings/course-meetings.controller.js';
import {
  CourseOfferingsByCourseController,
  CourseOfferingsController,
} from '../course-offerings/course-offerings.controller.js';
import { CoursesController } from './courses.controller.js';

function createContext(
  handler: (...args: string[]) => unknown,
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

describe('Course domain authorization', () => {
  const reflector = new Reflector();
  const guard = new RolesGuard(reflector);

  it.each([
    [CoursesController, CoursesController.prototype.list],
    [CourseOfferingsController, CourseOfferingsController.prototype.list],
    [
      CourseOfferingsByCourseController,
      CourseOfferingsByCourseController.prototype.create,
    ],
    [CourseMeetingsController, CourseMeetingsController.prototype.create],
  ])('requires ADMIN for %s', (controller, handler) => {
    expect(
      reflector.getAllAndOverride(ROLES_KEY, [handler, controller]),
    ).toEqual(['ADMIN']);
  });

  it('rejects authenticated non-admin users', () => {
    expect(() =>
      guard.canActivate(
        createContext(CoursesController.prototype.list, CoursesController, {
          role: 'INSTRUCTOR',
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  it('rejects unauthenticated requests', () => {
    expect(() =>
      guard.canActivate(
        createContext(
          CourseMeetingsController.prototype.list,
          CourseMeetingsController,
        ),
      ),
    ).toThrow(UnauthorizedException);
  });
});
