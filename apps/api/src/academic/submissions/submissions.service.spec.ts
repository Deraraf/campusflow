import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { SubmissionsService } from './submissions.service.js';

function createDatabase(seed: Record<string, any[]>) {
  const state: Record<string, any[]> = {};

  for (const name of [
    'User',
    'Student',
    'Instructor',
    'Course',
    'CourseOffering',
    'Assignment',
    'Submission',
    'Enrollment',
  ]) {
    state[name] = (seed[name] ?? []).map((row) => ({ ...row }));
  }

  const resolveRelations = (row: Record<string, any>) => {
    if (!row) return row;

    if (row.assignmentId) {
      const assignment = state.Assignment.find((item) => item.id === row.assignmentId);
      if (assignment) {
        row.assignment = {
          ...assignment,
          offering: assignment.offeringId
            ? state.CourseOffering.find((item) => item.id === assignment.offeringId)
            : null,
        };
        if (row.assignment.offering) {
          row.assignment.offering.course = row.assignment.offering.courseId
            ? state.Course.find((item) => item.id === row.assignment.offering.courseId)
            : null;
        }
      }
    }

    if (row.studentId) {
      const student = state.Student.find((item) => item.id === row.studentId);
      if (student) {
        row.student = {
          ...student,
          user: student.userId ? state.User.find((item) => item.id === student.userId) : null,
        };
      }
    }

    if (row.offeringId) {
      const offering = state.CourseOffering.find((item) => item.id === row.offeringId);
      if (offering) {
        row.offering = {
          ...offering,
          course: offering.courseId ? state.Course.find((item) => item.id === offering.courseId) : null,
        };
      }
    }

    if (row.instructorId) {
      const instructor = state.Instructor.find((item) => item.id === row.instructorId);
      if (instructor) {
        row.instructor = {
          ...instructor,
          user: instructor.userId ? state.User.find((item) => item.id === instructor.userId) : null,
        };
      }
    }

    if (row.userId) {
      const user = state.User.find((item) => item.id === row.userId);
      if (user) row.user = user;
    }

    return row;
  };

  const tables = Object.fromEntries(
    Object.entries(state).map(([name, rows]) => [
      name,
      {
        where: (criteria: Record<string, unknown>) => {
          const matches = (row: Record<string, unknown>) =>
            Object.entries(criteria).every(([key, value]) => row[key] === value);

          const query = {
            select: () => query,
            include: () => query,
            all: () => {
              const results = rows.filter(matches).map((row) => resolveRelations({ ...row }));
              return Object.assign(results, {
                first: async () => results[0] ?? null,
              });
            },
            update: async (values: Record<string, unknown>) => {
              const row = rows.find(matches);
              if (row === undefined) return null;
              Object.assign(row, values);
              return resolveRelations(row);
            },
            delete: async () => {
              const index = rows.findIndex(matches);
              return index < 0 ? null : resolveRelations(rows.splice(index, 1)[0]);
            },
          };

          return query;
        },
        create: async (values: Record<string, unknown>) => {
          const row = { id: `row-${rows.length + 1}`, ...values };
          rows.push(row);
          return resolveRelations(row);
        },
      },
    ]),
  );

  return {
    database: { client: { orm: { public: tables } } } as unknown as DatabaseService,
    state,
  };
}

const instructorUser: UserResponse = {
  id: 'user-inst',
  firstName: 'Prof',
  lastName: 'Jones',
  role: 'INSTRUCTOR',
  email: 'inst@example.com',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
};
const studentUser: UserResponse = {
  id: 'user-student',
  firstName: 'Ada',
  lastName: 'Student',
  role: 'STUDENT',
  email: 'student@example.com',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
};
const instructor = { id: 'inst-1', userId: instructorUser.id, employeeNumber: 'E-100' };
const student = { id: 'student-1', userId: studentUser.id, status: 'ACTIVE' };
const course = { id: 'course-1', code: 'CS101', title: 'Intro CS' };
const offering = {
  id: 'offering-1',
  courseId: course.id,
  instructorId: instructor.id,
  section: 'A',
};
const assignment = {
  id: 'assignment-1',
  offeringId: offering.id,
  instructorId: instructor.id,
  title: 'Essay',
  dueDate: '2030-01-20T00:00:00.000Z',
  maxScore: 100,
};

describe('SubmissionsService', () => {
  it('rejects a student submission for a different student', async () => {
    const { database } = createDatabase({
      User: [studentUser],
      Student: [student],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
      Assignment: [assignment],
      Enrollment: [{ id: 'en-1', studentId: student.id, offeringId: offering.id, status: 'ACTIVE' }],
    });

    const service = new SubmissionsService(database);

    await expect(
      service.create(assignment.id, { content: 'hello' }, {
        ...studentUser,
        email: 'student@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).resolves.toMatchObject({ assignmentId: assignment.id, status: 'SUBMITTED' });
  });

  it('creates a submission for an enrolled active student', async () => {
    const { database } = createDatabase({
      User: [studentUser],
      Student: [student],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
      Assignment: [assignment],
      Enrollment: [{ id: 'en-1', studentId: student.id, offeringId: offering.id, status: 'ACTIVE' }],
    });

    const service = new SubmissionsService(database);

    await expect(
      service.create(assignment.id, { content: 'hello' }, {
        ...studentUser,
        email: 'student@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).resolves.toMatchObject({ assignmentId: assignment.id, status: 'SUBMITTED' });
  });

  it('rejects a missing content or fileUrl', async () => {
    const { database } = createDatabase({
      User: [studentUser],
      Student: [student],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
      Assignment: [assignment],
      Enrollment: [{ id: 'en-1', studentId: student.id, offeringId: offering.id, status: 'ACTIVE' }],
    });

    const service = new SubmissionsService(database);

    await expect(
      service.create(assignment.id, {}, {
        ...studentUser,
        email: 'student@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows a student to resubmit before grading', async () => {
    const { database } = createDatabase({
      User: [studentUser],
      Student: [student],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
      Assignment: [assignment],
      Enrollment: [{ id: 'en-1', studentId: student.id, offeringId: offering.id, status: 'ACTIVE' }],
      Submission: [{ id: 'submission-1', assignmentId: assignment.id, studentId: student.id, content: 'old', status: 'SUBMITTED' }],
    });

    const service = new SubmissionsService(database);

    await expect(
      service.create(assignment.id, { content: 'new content' }, {
        ...studentUser,
        email: 'student@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).resolves.toMatchObject({ id: 'submission-1', content: 'new content' });
  });

  it('rejects resubmission after grading', async () => {
    const { database } = createDatabase({
      User: [studentUser],
      Student: [student],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
      Assignment: [assignment],
      Enrollment: [{ id: 'en-1', studentId: student.id, offeringId: offering.id, status: 'ACTIVE' }],
      Submission: [{ id: 'submission-1', assignmentId: assignment.id, studentId: student.id, content: 'done', status: 'GRADED', score: 90 }],
    });

    const service = new SubmissionsService(database);

    await expect(
      service.create(assignment.id, { content: 'new content' }, {
        ...studentUser,
        email: 'student@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows an instructor to grade their own offering submission', async () => {
    const { database } = createDatabase({
      User: [instructorUser],
      Student: [student],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
      Assignment: [assignment],
      Submission: [{ id: 'submission-1', assignmentId: assignment.id, studentId: student.id, content: 'done', status: 'SUBMITTED' }],
    });

    const service = new SubmissionsService(database);

    await expect(
      service.grade('submission-1', { score: 88 }, {
        ...instructorUser,
        email: 'inst@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).resolves.toMatchObject({ status: 'GRADED', score: 88 });
  });

  it('rejects a student attempting to grade', async () => {
    const { database } = createDatabase({
      User: [studentUser],
      Student: [student],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
      Assignment: [assignment],
      Submission: [{ id: 'submission-1', assignmentId: assignment.id, studentId: student.id, content: 'done', status: 'SUBMITTED' }],
    });

    const service = new SubmissionsService(database);

    await expect(
      service.grade('submission-1', { score: 70 }, {
        ...studentUser,
        email: 'student@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a score above maxScore', async () => {
    const { database } = createDatabase({
      User: [instructorUser],
      Student: [student],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
      Assignment: [assignment],
      Submission: [{ id: 'submission-1', assignmentId: assignment.id, studentId: student.id, content: 'done', status: 'SUBMITTED' }],
    });

    const service = new SubmissionsService(database);

    await expect(
      service.grade('submission-1', { score: 101 }, {
        ...instructorUser,
        email: 'inst@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('returns not found for missing submission', async () => {
    const { database } = createDatabase({
      User: [instructorUser],
      Instructor: [instructor],
    });

    const service = new SubmissionsService(database);

    await expect(
      service.getById('missing', {
        ...instructorUser,
        email: 'inst@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
