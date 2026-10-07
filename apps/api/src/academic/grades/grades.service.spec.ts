import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { GradesService } from './grades.service.js';

function createDatabase(seed: Record<string, unknown[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};
  const names = [
    'User',
    'Instructor',
    'Course',
    'AcademicTerm',
    'CourseOffering',
    'Enrollment',
    'Student',
    'Grade',
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

const instructorUser: UserResponse = {
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

const studentUser: UserResponse = {
  id: 'user-2',
  email: 'student@example.com',
  firstName: 'Sam',
  lastName: 'Student',
  role: 'STUDENT',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const instructor = {
  id: 'instructor-1',
  userId: instructorUser.id,
  employeeNumber: 'E-1',
  departmentId: 'dept-1',
};
const student = {
  id: 'student-1',
  userId: studentUser.id,
  studentNumber: 'S-100',
};
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
const enrollment = {
  id: 'enrollment-1',
  studentId: student.id,
  offeringId: offering.id,
  status: 'ACTIVE',
  enrolledAt: '2025-01-15T00:00:00.000Z',
};

describe('GradesService', () => {
  it('rejects negative scores when creating a final grade', async () => {
    const { database } = createDatabase({
      User: [instructorUser, studentUser],
      Instructor: [instructor],
      Student: [student],
      Course: [course],
      AcademicTerm: [academicTerm],
      CourseOffering: [offering],
      Enrollment: [enrollment],
    });

    const service = new GradesService(database);

    await expect(
      service.create(enrollment.id, { score: -1 }, instructorUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('forbids students from reading another student grade by id', async () => {
    const { database } = createDatabase({
      User: [instructorUser, studentUser],
      Instructor: [instructor],
      Student: [student],
      Course: [course],
      AcademicTerm: [academicTerm],
      CourseOffering: [offering],
      Enrollment: [enrollment],
      Grade: [
        {
          id: 'grade-1',
          enrollmentId: enrollment.id,
          studentId: student.id,
          score: 91,
          letterGrade: 'A',
        },
      ],
    });

    const service = new GradesService(database);
    const otherStudent: UserResponse = {
      ...studentUser,
      id: 'user-3',
      email: 'other@example.com',
      firstName: 'Other',
      lastName: 'Student',
    };

    await expect(
      service.getById('grade-1', otherStudent),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects instructors from grading another instructor's offering", async () => {
    const { database } = createDatabase({
      User: [instructorUser, studentUser],
      Instructor: [instructor],
      Student: [student],
      Course: [course],
      AcademicTerm: [academicTerm],
      CourseOffering: [offering],
      Enrollment: [enrollment],
    });

    const service = new GradesService(database);
    const otherInstructor: UserResponse = {
      ...instructorUser,
      id: 'user-9',
      email: 'other-instructor@example.com',
      firstName: 'Other',
      lastName: 'Instructor',
    };

    await expect(
      service.create(enrollment.id, { score: 90 }, otherInstructor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
