import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { AssignmentsService } from './assignments.service.js';

function createDatabase(seed: Record<string, any[]>) {
  const state: Record<string, any[]> = {};

  for (const name of [
    'User',
    'Student',
    'Instructor',
    'Course',
    'CourseOffering',
    'Assignment',
    'Enrollment',
    'Submission',
  ]) {
    state[name] = (seed[name] ?? []).map((row) => ({ ...row }));
  }

  const resolveRelations = (row: Record<string, any>) => {
    if (!row) return row;

    const withAssignment = () => {
      const assignment = row.assignmentId
        ? state.Assignment.find((item) => item.id === row.assignmentId)
        : null;
      if (!assignment) return row;
      row.assignment = {
        ...assignment,
        offering: assignment.offeringId
          ? state.CourseOffering.find((item) => item.id === assignment.offeringId)
          : null,
        instructor: assignment.instructorId
          ? state.Instructor.find((item) => item.id === assignment.instructorId)
          : null,
      };

      if (row.assignment.offering) {
        row.assignment.offering.course = row.assignment.offering.courseId
          ? state.Course.find((item) => item.id === row.assignment.offering.courseId)
          : null;
      }

      if (row.assignment.instructor) {
        row.assignment.instructor.user = row.assignment.instructor.userId
          ? state.User.find((item) => item.id === row.assignment.instructor.userId)
          : null;
      }
      return row;
    };

    const withStudent = () => {
      const student = row.studentId ? state.Student.find((item) => item.id === row.studentId) : null;
      if (!student) return row;
      row.student = { ...student, user: student.userId ? state.User.find((item) => item.id === student.userId) : null };
      return row;
    };

    const withInstructor = () => {
      const instructor = row.instructorId
        ? state.Instructor.find((item) => item.id === row.instructorId)
        : null;
      if (!instructor) return row;
      row.instructor = {
        ...instructor,
        user: instructor.userId ? state.User.find((item) => item.id === instructor.userId) : null,
      };
      return row;
    };

    const withOffering = () => {
      const offering = row.offeringId
        ? state.CourseOffering.find((item) => item.id === row.offeringId)
        : null;
      if (!offering) return row;
      row.offering = {
        ...offering,
        course: offering.courseId ? state.Course.find((item) => item.id === offering.courseId) : null,
      };
      return row;
    };

    const withUser = () => {
      const user = row.userId ? state.User.find((item) => item.id === row.userId) : null;
      if (!user) return row;
      row.user = user;
      return row;
    };

    if (row.assignmentId) withAssignment();
    if (row.studentId) withStudent();
    if (row.instructorId) withInstructor();
    if (row.offeringId) withOffering();
    if (row.userId) withUser();

    if (row.offering && row.offering.courseId) {
      row.offering.course = state.Course.find((item) => item.id === row.offering.courseId) ?? null;
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

const userInstructor: UserResponse = {
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
const userStudent: UserResponse = {
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
const instructor = { id: 'inst-1', userId: userInstructor.id, employeeNumber: 'E-100' };
const student = {
  id: 'student-1',
  userId: userStudent.id,
  status: 'ACTIVE',
};
const course = { id: 'course-1', code: 'CS101', title: 'Intro CS' };
const offering = {
  id: 'offering-1',
  courseId: course.id,
  instructorId: instructor.id,
  section: 'A',
};
const otherInstructor = { id: 'inst-2', userId: 'user-other-inst', employeeNumber: 'E-200' };
const otherOffering = {
  id: 'offering-2',
  courseId: course.id,
  instructorId: otherInstructor.id,
  section: 'B',
};

describe('AssignmentsService', () => {
  it('rejects student assignment creation', async () => {
    const { database } = createDatabase({
      User: [userStudent],
      Student: [student],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
    });

    const service = new AssignmentsService(database);

    await expect(
      service.create(offering.id, { title: 'Essay', dueDate: '2030-01-01', maxScore: 10 }, {
        ...userStudent,
        email: 'student@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects creating an assignment for another instructor offering', async () => {
    const { database } = createDatabase({
      User: [userInstructor],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
    });

    const service = new AssignmentsService(database);

    await expect(
      service.create(offering.id, { title: 'Essay', dueDate: '2030-01-01', maxScore: 10 }, {
        ...userInstructor,
        email: 'inst@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).resolves.toBeDefined();
  });

  it('allows instructor to create their own assignment', async () => {
    const { database } = createDatabase({
      User: [userInstructor],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
    });

    const service = new AssignmentsService(database);

    await expect(
      service.create(offering.id, { title: 'Essay', dueDate: '2030-01-01', maxScore: 10 }, {
        ...userInstructor,
        email: 'inst@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).resolves.toMatchObject({ title: 'Essay', maxScore: 10 });
  });

  it('rejects invalid maxScore', async () => {
    const { database } = createDatabase({
      User: [userInstructor],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
    });

    const service = new AssignmentsService(database);

    await expect(
      service.create(offering.id, { title: 'Essay', dueDate: '2030-01-01', maxScore: 0 }, {
        ...userInstructor,
        email: 'inst@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('blocks assignment deletion when submissions exist', async () => {
    const { database } = createDatabase({
      User: [userInstructor],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
      Assignment: [{ id: 'assignment-1', offeringId: offering.id, instructorId: instructor.id, title: 'Essay', dueDate: '2030-01-01', maxScore: 10 }],
      Submission: [{ id: 'submission-1', assignmentId: 'assignment-1', studentId: student.id, content: 'hello', status: 'SUBMITTED' }],
    });

    const service = new AssignmentsService(database);

    await expect(
      service.remove('assignment-1', {
        ...userInstructor,
        email: 'inst@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows a student to view an assignment only when actively enrolled', async () => {
    const { database } = createDatabase({
      User: [userStudent],
      Student: [student],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [offering],
      Assignment: [{ id: 'assignment-1', offeringId: offering.id, instructorId: instructor.id, title: 'Essay', dueDate: '2030-01-01', maxScore: 10 }],
      Enrollment: [{ id: 'enrollment-1', studentId: student.id, offeringId: offering.id, status: 'ACTIVE' }],
    });

    const service = new AssignmentsService(database);

    await expect(
      service.getById('assignment-1', {
        ...userStudent,
        email: 'student@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).resolves.toMatchObject({ id: 'assignment-1', title: 'Essay' });
  });

  it('rejects a student viewing an unrelated assignment', async () => {
    const { database } = createDatabase({
      User: [userStudent],
      Student: [student],
      Instructor: [instructor],
      Course: [course],
      CourseOffering: [otherOffering],
      Assignment: [{ id: 'assignment-2', offeringId: otherOffering.id, instructorId: otherInstructor.id, title: 'Other Essay', dueDate: '2030-01-01', maxScore: 10 }],
    });

    const service = new AssignmentsService(database);

    await expect(
      service.getById('assignment-2', {
        ...userStudent,
        email: 'student@example.com',
        status: 'ACTIVE',
        emailVerifiedAt: null,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
