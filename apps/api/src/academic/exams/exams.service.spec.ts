import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { ExamsService } from './exams.service.js';

function createDatabase(seed: Record<string, unknown[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};
  const names = [
    'User',
    'Instructor',
    'Course',
    'AcademicTerm',
    'CourseOffering',
    'Enrollment',
    'Exam',
    'Student',
  ];

  for (const name of names) {
    state[name] = ((seed[name] ?? []) as Record<string, unknown>[]).map(
      (row) => ({ ...row }),
    );
  }

  let generatedId = 1;
  const tables = Object.fromEntries(
    Object.entries(state).map(([name, rows]) => [
      name,
      {
        where: (criteria: Record<string, unknown>) => {
          const matches = (row: Record<string, unknown>) =>
            Object.entries(criteria).every(
              ([key, value]) => row[key] === value,
            );

          const query = {
            select: () => query,
            all: () => {
              const results = rows.filter(matches);
              return Object.assign(results, {
                first: async () => results[0] ?? null,
              });
            },
            update: async (values: Record<string, unknown>) => {
              const row = rows.find(matches);
              if (row === undefined) return null;
              Object.assign(row, values);
              return row;
            },
            delete: async () => {
              const index = rows.findIndex(matches);
              return index < 0 ? null : rows.splice(index, 1)[0];
            },
          };
          return query;
        },
        create: async (values: Record<string, unknown>) => {
          const row = { id: `generated-${generatedId++}`, ...values };
          rows.push(row);
          return row;
        },
      },
    ]),
  );

  return {
    database: {
      client: { orm: { public: tables } },
    } as unknown as DatabaseService,
    state,
  };
}

const user: UserResponse = {
  id: 'user-1',
  email: 'ins@example.com',
  firstName: 'Ada',
  lastName: 'Stone',
  role: 'INSTRUCTOR',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const instructor = { id: 'instructor-1', userId: user.id };
const course = { id: 'course-1', code: 'CS101', title: 'Intro to CS' };
const academicTerm = {
  id: 'term-1',
  academicYearId: 'year-1',
  semester: 'FIRST',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2025-05-31T00:00:00.000Z',
  isCurrent: true,
};
const offering = {
  id: 'offering-1',
  courseId: course.id,
  instructorId: instructor.id,
  academicTermId: academicTerm.id,
  section: 'A',
  capacity: 20,
};

describe('ExamsService', () => {
  it('creates an exam for an instructor-owned offering', async () => {
    const { database } = createDatabase({
      User: [user],
      Instructor: [instructor],
      Course: [course],
      AcademicTerm: [academicTerm],
      CourseOffering: [offering],
    });

    const service = new ExamsService(database);

    await expect(
      service.create(
        offering.id,
        {
          title: 'Midterm',
          examDate: '2025-02-15',
          maxScore: 100,
        },
        user,
      ),
    ).resolves.toMatchObject({
      title: 'Midterm',
      maxScore: 100,
      offeringId: offering.id,
    });
  });

  it('rejects exam dates outside the term window', async () => {
    const { database } = createDatabase({
      User: [user],
      Instructor: [instructor],
      Course: [course],
      AcademicTerm: [academicTerm],
      CourseOffering: [offering],
    });

    const service = new ExamsService(database);

    await expect(
      service.create(
        offering.id,
        {
          title: 'Midterm',
          examDate: '2025-06-01',
          maxScore: 100,
        },
        user,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents students from updating exams', async () => {
    const { database } = createDatabase({
      User: [user],
      Instructor: [instructor],
      Course: [course],
      AcademicTerm: [academicTerm],
      CourseOffering: [offering],
      Exam: [
        {
          id: 'exam-1',
          offeringId: offering.id,
          instructorId: instructor.id,
          title: 'Quiz',
          examDate: '2025-02-10T00:00:00.000Z',
          maxScore: 50,
        },
      ],
    });

    const service = new ExamsService(database);
    const studentUser: UserResponse = {
      ...user,
      id: 'user-2',
      role: 'STUDENT',
    };

    await expect(
      service.update('exam-1', { title: 'Quiz 2' }, studentUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects students from viewing a non-enrolled offering exam list', async () => {
    const { database } = createDatabase({
      User: [user],
      Instructor: [instructor],
      Course: [course],
      AcademicTerm: [academicTerm],
      CourseOffering: [offering],
      Student: [{ id: 'student-1', userId: 'user-2' }],
      Exam: [
        {
          id: 'exam-1',
          offeringId: offering.id,
          instructorId: instructor.id,
          title: 'Quiz',
          examDate: '2025-02-10T00:00:00.000Z',
          maxScore: 50,
        },
      ],
    });

    const service = new ExamsService(database);
    const studentUser: UserResponse = {
      ...user,
      id: 'user-2',
      role: 'STUDENT',
      email: 'student@example.com',
      firstName: 'Sam',
      lastName: 'Student',
    };

    await expect(
      service.listForOffering(offering.id, studentUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
