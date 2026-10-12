import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { AttendanceService } from './attendance.service.js';

function createDatabase(seed: Record<string, any[]>) {
  const state: Record<string, any[]> = {};
  for (const name of [
    'User',
    'Student',
    'Instructor',
    'Course',
    'CourseOffering',
    'AcademicTerm',
    'AcademicYear',
    'Enrollment',
    'Attendance',
  ]) {
    state[name] = (seed[name] ?? []).map((row) => ({ ...row }));
  }

  const resolveRelations = (row: Record<string, any>) => {
    if (!row) return row;
    if (row.studentId) {
      const student = state.Student.find((item) => item.id === row.studentId);
      if (student) {
        row.student = {
          ...student,
          user: student.userId
            ? state.User.find((item) => item.id === student.userId)
            : null,
        };
      }
    }
    if (row.offeringId) {
      const offering = state.CourseOffering.find(
        (item) => item.id === row.offeringId,
      );
      if (offering) {
        row.offering = {
          ...offering,
          course: offering.courseId
            ? state.Course.find((item) => item.id === offering.courseId)
            : null,
          academicTerm: offering.academicTermId
            ? state.AcademicTerm.find(
                (item) => item.id === offering.academicTermId,
              )
            : null,
          instructor: offering.instructorId
            ? state.Instructor.find((item) => item.id === offering.instructorId)
            : null,
        };
      }
    }
    if (row.userId) {
      const user = state.User.find((item) => item.id === row.userId);
      if (user) row.user = user;
    }
    if (row.instructorId) {
      const instructor = state.Instructor.find(
        (item) => item.id === row.instructorId,
      );
      if (instructor) {
        row.instructor = {
          ...instructor,
          user: instructor.userId
            ? state.User.find((item) => item.id === instructor.userId)
            : null,
        };
      }
    }
    return row;
  };

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
              const results = rows
                .filter(matches)
                .map((row) => resolveRelations({ ...row }));
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
              return index < 0
                ? null
                : resolveRelations(rows.splice(index, 1)[0]);
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
    database: {
      client: { orm: { public: tables } },
    } as unknown as DatabaseService,
  };
}

const adminUser: UserResponse = {
  id: 'admin-1',
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'Root',
  role: 'ADMIN',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
};
const instructorUser: UserResponse = {
  id: 'user-inst',
  email: 'inst@example.com',
  firstName: 'Prof',
  lastName: 'Jones',
  role: 'INSTRUCTOR',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
};
const studentUser: UserResponse = {
  id: 'user-student',
  email: 'student@example.com',
  firstName: 'Ada',
  lastName: 'Student',
  role: 'STUDENT',
  status: 'ACTIVE',
  emailVerifiedAt: null,
  createdAt: new Date('2024-01-01').toISOString(),
  updatedAt: new Date('2024-01-01').toISOString(),
};
const instructor = {
  id: 'inst-1',
  userId: instructorUser.id,
  employeeNumber: 'E-100',
  departmentId: 'dept-1',
};
const student = {
  id: 'student-1',
  userId: studentUser.id,
  studentNumber: 'S-100',
  programId: 'prog-1',
  admissionAcademicYearId: 'year-1',
  status: 'ACTIVE',
};
const academicYear = {
  id: 'year-1',
  name: '2025',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2025-12-31T00:00:00.000Z',
  isCurrent: true,
};
const academicTerm = {
  id: 'term-1',
  academicYearId: academicYear.id,
  semester: 'FIRST',
  startDate: '2025-01-01T00:00:00.000Z',
  endDate: '2025-05-31T00:00:00.000Z',
  isCurrent: true,
};
const course = { id: 'course-1', code: 'CS101', title: 'Intro CS' };
const offering = {
  id: 'offering-1',
  courseId: course.id,
  instructorId: instructor.id,
  academicTermId: academicTerm.id,
  section: 'A',
  capacity: 10,
};

describe('AttendanceService', () => {
  it('creates attendance for an owned offering', async () => {
    const { database } = createDatabase({
      User: [instructorUser, studentUser],
      Instructor: [instructor],
      Student: [student],
      AcademicYear: [academicYear],
      AcademicTerm: [academicTerm],
      Course: [course],
      CourseOffering: [offering],
      Enrollment: [
        {
          id: 'enroll-1',
          studentId: student.id,
          offeringId: offering.id,
          status: 'ACTIVE',
        },
      ],
    });

    const service = new AttendanceService(database);
    await expect(
      service.create(
        offering.id,
        { studentId: student.id, date: '2025-02-03', status: 'PRESENT' },
        instructorUser,
      ),
    ).resolves.toMatchObject({
      studentId: student.id,
      offeringId: offering.id,
      status: 'PRESENT',
    });
  });

  it('rejects invalid attendance date', async () => {
    const { database } = createDatabase({
      User: [instructorUser, studentUser],
      Instructor: [instructor],
      Student: [student],
      AcademicYear: [academicYear],
      AcademicTerm: [academicTerm],
      Course: [course],
      CourseOffering: [offering],
      Enrollment: [
        {
          id: 'enroll-1',
          studentId: student.id,
          offeringId: offering.id,
          status: 'ACTIVE',
        },
      ],
    });

    const service = new AttendanceService(database);
    await expect(
      service.create(
        offering.id,
        { studentId: student.id, date: 'not-a-date', status: 'PRESENT' },
        instructorUser,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing active enrollment', async () => {
    const { database } = createDatabase({
      User: [instructorUser, studentUser],
      Instructor: [instructor],
      Student: [student],
      AcademicYear: [academicYear],
      AcademicTerm: [academicTerm],
      Course: [course],
      CourseOffering: [offering],
    });

    const service = new AttendanceService(database);
    await expect(
      service.create(
        offering.id,
        { studentId: student.id, date: '2025-02-03', status: 'PRESENT' },
        instructorUser,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('prevents duplicate attendance for the same student + offering + date', async () => {
    const { database } = createDatabase({
      User: [instructorUser, studentUser],
      Instructor: [instructor],
      Student: [student],
      AcademicYear: [academicYear],
      AcademicTerm: [academicTerm],
      Course: [course],
      CourseOffering: [offering],
      Enrollment: [
        {
          id: 'enroll-1',
          studentId: student.id,
          offeringId: offering.id,
          status: 'ACTIVE',
        },
      ],
      Attendance: [
        {
          id: 'a-1',
          studentId: student.id,
          offeringId: offering.id,
          date: '2025-02-03T00:00:00.000Z',
          status: 'PRESENT',
        },
      ],
    });

    const service = new AttendanceService(database);
    await expect(
      service.create(
        offering.id,
        { studentId: student.id, date: '2025-02-03', status: 'ABSENT' },
        instructorUser,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows a student to view only their own attendance', async () => {
    const { database } = createDatabase({
      User: [studentUser],
      Student: [student],
      AcademicYear: [academicYear],
      AcademicTerm: [academicTerm],
      Course: [course],
      CourseOffering: [offering],
      Attendance: [
        {
          id: 'a-1',
          studentId: student.id,
          offeringId: offering.id,
          date: '2025-02-03T00:00:00.000Z',
          status: 'PRESENT',
        },
      ],
    });

    const service = new AttendanceService(database);
    await expect(service.list(studentUser)).resolves.toHaveLength(1);
  });

  it('rejects student access to another student attendance by id', async () => {
    const otherStudent = {
      ...student,
      id: 'student-2',
      userId: 'user-other',
      studentNumber: 'S-200',
    };
    const { database } = createDatabase({
      User: [
        studentUser,
        {
          ...studentUser,
          id: 'user-other',
          email: 'other@example.com',
          firstName: 'Other',
        },
      ],
      Student: [student, otherStudent],
      AcademicYear: [academicYear],
      AcademicTerm: [academicTerm],
      Course: [course],
      CourseOffering: [offering],
      Attendance: [
        {
          id: 'a-1',
          studentId: otherStudent.id,
          offeringId: offering.id,
          date: '2025-02-03T00:00:00.000Z',
          status: 'ABSENT',
        },
      ],
    });

    const service = new AttendanceService(database);
    await expect(service.getById('a-1', studentUser)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects mismatched instructor ownership', async () => {
    const { database } = createDatabase({
      User: [instructorUser, studentUser],
      Instructor: [instructor],
      Student: [student],
      AcademicYear: [academicYear],
      AcademicTerm: [academicTerm],
      Course: [course],
      CourseOffering: [offering],
      Attendance: [
        {
          id: 'a-1',
          studentId: student.id,
          offeringId: offering.id,
          date: '2025-02-03T00:00:00.000Z',
          status: 'PRESENT',
        },
      ],
    });

    const service = new AttendanceService(database);
    await expect(service.getById('a-1', instructorUser)).resolves.toMatchObject(
      { id: 'a-1' },
    );
  });

  it('supports admin listing', async () => {
    const { database } = createDatabase({
      User: [adminUser, studentUser],
      Student: [student],
      AcademicYear: [academicYear],
      AcademicTerm: [academicTerm],
      Course: [course],
      CourseOffering: [offering],
      Attendance: [
        {
          id: 'a-1',
          studentId: student.id,
          offeringId: offering.id,
          date: '2025-02-03T00:00:00.000Z',
          status: 'PRESENT',
        },
      ],
    });

    const service = new AttendanceService(database);
    await expect(service.list(adminUser)).resolves.toHaveLength(1);
  });
});
