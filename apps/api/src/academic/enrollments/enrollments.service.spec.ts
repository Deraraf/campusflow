import { ConflictException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { EnrollmentsService } from './enrollments.service.js';

function createDatabase(seed: Record<string, Record<string, unknown>[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};

  for (const name of [
    'Student',
    'User',
    'CourseOffering',
    'Course',
    'AcademicTerm',
    'AcademicYear',
    'Instructor',
    'Enrollment',
    'StudentAcademicStanding',
  ]) {
    state[name] = (seed[name] ?? []).map((row) => ({ ...row }));
  }

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
            include: () => query,
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
          const row = { id: `row-${rows.length + 1}`, ...values };
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

const year = { id: 'year-1', name: '2025-2026' };
const term = { id: 'term-1', semester: 'FIRST', academicYearId: year.id };
const user = {
  id: 'user-1',
  firstName: 'Ada',
  lastName: 'Lovelace',
  role: 'STUDENT',
};
const student = {
  id: 'student-1',
  userId: user.id,
  studentNumber: 'S-1001',
  programId: 'program-1',
  status: 'ACTIVE',
};
const instructor = {
  id: 'instructor-1',
  employeeNumber: 'E-101',
  userId: 'user-2',
};
const course = { id: 'course-1', code: 'CS101', title: 'Intro to CS' };
const offering = {
  id: 'offering-1',
  courseId: course.id,
  instructorId: instructor.id,
  academicTermId: term.id,
  section: 'A',
  capacity: 2,
};
const standing = {
  id: 'standing-1',
  studentId: student.id,
  academicTermId: term.id,
  programYear: 1,
};

describe('EnrollmentsService', () => {
  it('rejects a missing student for enrollment creation', async () => {
    const { database } = createDatabase({
      Student: [],
      CourseOffering: [offering],
      Course: [course],
      AcademicTerm: [term],
      AcademicYear: [year],
      Instructor: [instructor],
      StudentAcademicStanding: [standing],
    });

    const service = new EnrollmentsService(database);

    await expect(
      service.create({ studentId: student.id, offeringId: offering.id }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects enrollment for a student that is not active', async () => {
    const { database } = createDatabase({
      Student: [{ ...student, status: 'SUSPENDED' }],
      CourseOffering: [offering],
      Course: [course],
      AcademicTerm: [term],
      AcademicYear: [year],
      Instructor: [instructor],
      StudentAcademicStanding: [standing],
    });

    const service = new EnrollmentsService(database);

    await expect(
      service.create({ studentId: student.id, offeringId: offering.id }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects enrollment when the student is missing academic standing for the term', async () => {
    const { database } = createDatabase({
      Student: [student],
      CourseOffering: [offering],
      Course: [course],
      AcademicTerm: [term],
      AcademicYear: [year],
      Instructor: [instructor],
      StudentAcademicStanding: [],
    });

    const service = new EnrollmentsService(database);

    await expect(
      service.create({ studentId: student.id, offeringId: offering.id }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a duplicate enrollment', async () => {
    const { database } = createDatabase({
      Student: [student],
      CourseOffering: [offering],
      Course: [course],
      AcademicTerm: [term],
      AcademicYear: [year],
      Instructor: [instructor],
      StudentAcademicStanding: [standing],
      Enrollment: [
        {
          id: 'enr-1',
          studentId: student.id,
          offeringId: offering.id,
          status: 'ACTIVE',
        },
      ],
    });

    const service = new EnrollmentsService(database);

    await expect(
      service.create({ studentId: student.id, offeringId: offering.id }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates an ACTIVE enrollment with an enrolledAt timestamp', async () => {
    const { database } = createDatabase({
      Student: [student],
      CourseOffering: [offering],
      Course: [course],
      AcademicTerm: [term],
      AcademicYear: [year],
      Instructor: [instructor],
      StudentAcademicStanding: [standing],
    });

    const service = new EnrollmentsService(database);

    await expect(
      service.create({ studentId: student.id, offeringId: offering.id }),
    ).resolves.toMatchObject({
      status: 'ACTIVE',
      student: { id: student.id },
      offering: { id: offering.id },
    });
  });

  it('rejects enrollment when the offering is at capacity', async () => {
    const { database } = createDatabase({
      Student: [student],
      CourseOffering: [offering],
      Course: [course],
      AcademicTerm: [term],
      AcademicYear: [year],
      Instructor: [instructor],
      StudentAcademicStanding: [standing],
      Enrollment: [
        {
          id: 'enr-1',
          studentId: 'student-2',
          offeringId: offering.id,
          status: 'ACTIVE',
        },
        {
          id: 'enr-2',
          studentId: 'student-3',
          offeringId: offering.id,
          status: 'ACTIVE',
        },
      ],
    });

    const service = new EnrollmentsService(database);

    await expect(
      service.create({ studentId: student.id, offeringId: offering.id }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows status transitions from ACTIVE to DROPPED and preserves enrolledAt', async () => {
    const { database } = createDatabase({
      Student: [student],
      CourseOffering: [offering],
      Course: [course],
      AcademicTerm: [term],
      AcademicYear: [year],
      Instructor: [instructor],
      StudentAcademicStanding: [standing],
      Enrollment: [
        {
          id: 'enr-1',
          studentId: student.id,
          offeringId: offering.id,
          status: 'ACTIVE',
          enrolledAt: '2025-01-10T00:00:00.000Z',
        },
      ],
    });

    const service = new EnrollmentsService(database);

    await expect(
      service.updateStatus('enr-1', { status: 'DROPPED' }),
    ).resolves.toMatchObject({
      status: 'DROPPED',
      enrolledAt: '2025-01-10T00:00:00.000Z',
    });
  });

  it('rejects invalid enrollment status transitions', async () => {
    const { database } = createDatabase({
      Student: [student],
      CourseOffering: [offering],
      Course: [course],
      AcademicTerm: [term],
      AcademicYear: [year],
      Instructor: [instructor],
      StudentAcademicStanding: [standing],
      Enrollment: [
        {
          id: 'enr-1',
          studentId: student.id,
          offeringId: offering.id,
          status: 'COMPLETED',
          enrolledAt: '2025-01-10T00:00:00.000Z',
        },
      ],
    });

    const service = new EnrollmentsService(database);

    await expect(
      service.updateStatus('enr-1', { status: 'ACTIVE' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('lists active enrollments for a student when using authenticated identity', async () => {
    const { database } = createDatabase({
      Student: [student],
      User: [user],
      CourseOffering: [offering],
      Course: [course],
      AcademicTerm: [term],
      AcademicYear: [year],
      Instructor: [instructor],
      Enrollment: [
        {
          id: 'enr-1',
          studentId: student.id,
          offeringId: offering.id,
          status: 'ACTIVE',
        },
      ],
    });

    const service = new EnrollmentsService(database);

    await expect(service.getMyEnrollments(user.id)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'enr-1', status: 'ACTIVE' }),
      ]),
    );
  });
});
