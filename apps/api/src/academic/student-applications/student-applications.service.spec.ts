import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { UserResponse } from '../../users/entities/user.entity.js';
import { ApproveStudentApplicationDto } from './dto/approve-student-application.dto.js';
import { StudentApplicationsService } from './student-applications.service.js';

function createDatabase(
  seed: Record<string, Record<string, unknown>[]>,
  failCreateTable?: string,
) {
  const state: Record<string, Record<string, unknown>[]> = {};
  for (const name of [
    'User',
    'Program',
    'Student',
    'StudentApplication',
    'AcademicYear',
    'AcademicTerm',
    'StudentAcademicStanding',
  ]) {
    state[name] = (seed[name] ?? []).map((row) => ({ ...row }));
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
          };
          return query;
        },
        create: async (values: Record<string, unknown>) => {
          if (name === failCreateTable) {
            throw new Error('simulated transaction failure');
          }
          const row = {
            id: `generated-${generatedId++}`,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            ...values,
          };
          rows.push(row);
          return row;
        },
      },
    ]),
  );
  const orm = { public: tables };
  const client = {
    orm,
    transaction: async (
      callback: (tx: { orm: typeof orm }) => Promise<unknown>,
    ) => {
      const snapshot = Object.fromEntries(
        Object.entries(state).map(([name, rows]) => [
          name,
          rows.map((row) => ({ ...row })),
        ]),
      );
      try {
        return await callback({ orm });
      } catch (error) {
        for (const [name, rows] of Object.entries(snapshot)) {
          state[name]!.splice(0, state[name]!.length, ...rows);
        }
        throw error;
      }
    },
  };
  return {
    database: { client } as unknown as DatabaseService,
    state,
  };
}

const applicant: UserResponse = {
  id: 'user-1',
  email: 'student@example.test',
  firstName: 'Ada',
  lastName: 'Student',
  role: 'STUDENT',
  status: 'ACTIVE',
  emailVerifiedAt: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const program = { id: 'program-1', durationYears: 4 };
const academicYear = { id: 'year-1' };
const academicTerm = { id: 'term-1', academicYearId: academicYear.id };
const application = {
  id: 'application-1',
  userId: applicant.id,
  programId: program.id,
  studentId: null,
  status: 'UNDER_REVIEW',
  applicationNumber: 'APP-1',
  reviewedAt: null,
  rejectionReason: null,
};

function approvalDto(
  overrides: Partial<ApproveStudentApplicationDto> = {},
): ApproveStudentApplicationDto {
  return {
    studentNumber: 'S-001',
    admissionAcademicYearId: academicYear.id,
    academicTermId: academicTerm.id,
    programYear: 1,
    ...overrides,
  };
}

describe('StudentApplicationsService', () => {
  it('creates an owned application with a generated number', async () => {
    const { database, state } = createDatabase({ Program: [program] });
    const service = new StudentApplicationsService(database);

    await expect(
      service.create(applicant, { programId: program.id }),
    ).resolves.toMatchObject({
      userId: applicant.id,
      programId: program.id,
      status: 'PENDING',
      applicationNumber: expect.stringMatching(/^APP-[0-9A-F-]+$/),
    });
    expect(state.StudentApplication).toHaveLength(1);
    expect(state.StudentApplication[0]?.userId).toBe(applicant.id);
  });

  it('rejects an account that already has a Student record', async () => {
    const { database } = createDatabase({
      Program: [program],
      Student: [{ id: 'student-1', userId: applicant.id }],
    });
    const service = new StudentApplicationsService(database);

    await expect(
      service.create(applicant, { programId: program.id }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a non-active or unverified applicant', async () => {
    const { database } = createDatabase({ Program: [program] });
    const service = new StudentApplicationsService(database);

    await expect(
      service.create(
        { ...applicant, emailVerifiedAt: null },
        { programId: program.id },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects a missing Program', async () => {
    const { database } = createDatabase({});
    const service = new StudentApplicationsService(database);

    await expect(
      service.create(applicant, { programId: program.id }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a second active application but permits reapplication after rejection', async () => {
    const { database } = createDatabase({
      Program: [program],
      StudentApplication: [{ ...application, status: 'PENDING' }],
    });
    const service = new StudentApplicationsService(database);

    await expect(
      service.create(applicant, { programId: program.id }),
    ).rejects.toBeInstanceOf(ConflictException);

    const { database: reapplicationDatabase } = createDatabase({
      Program: [program],
      StudentApplication: [{ ...application, status: 'REJECTED' }],
    });
    const reapplicationService = new StudentApplicationsService(
      reapplicationDatabase,
    );
    await expect(
      reapplicationService.create(applicant, { programId: program.id }),
    ).resolves.toMatchObject({ status: 'PENDING' });
  });

  it('scopes applicant reads and cancellation to the owner', async () => {
    const { database } = createDatabase({
      StudentApplication: [
        { ...application, userId: 'another-user', status: 'PENDING' },
      ],
    });
    const service = new StudentApplicationsService(database);

    await expect(
      service.getMine(applicant.id, application.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.cancel(applicant.id, application.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cancels an owned PENDING application', async () => {
    const { database } = createDatabase({
      StudentApplication: [{ ...application, status: 'PENDING' }],
    });
    const service = new StudentApplicationsService(database);

    await expect(
      service.cancel(applicant.id, application.id),
    ).resolves.toMatchObject({
      status: 'CANCELLED',
    });
  });

  it('moves only PENDING applications into review', async () => {
    const { database } = createDatabase({
      StudentApplication: [{ ...application, status: 'PENDING' }],
    });
    const service = new StudentApplicationsService(database);

    await expect(service.review(application.id)).resolves.toMatchObject({
      status: 'UNDER_REVIEW',
      reviewedAt: null,
    });
  });

  it('rejects applications only with a non-whitespace reason', async () => {
    const { database, state } = createDatabase({
      StudentApplication: [{ ...application, status: 'UNDER_REVIEW' }],
    });
    const service = new StudentApplicationsService(database);

    await expect(
      service.reject(application.id, { rejectionReason: '   ' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.reject(application.id, { rejectionReason: 'Incomplete records' }),
    ).resolves.toMatchObject({
      status: 'REJECTED',
      rejectionReason: 'Incomplete records',
      reviewedAt: expect.any(String),
    });
    expect(state.Student).toHaveLength(0);
  });

  it('approves atomically by creating Student, initial Standing, and updating the application', async () => {
    const { database, state } = createDatabase({
      User: [
        {
          id: applicant.id,
          role: 'STUDENT',
          status: 'ACTIVE',
          emailVerifiedAt: applicant.emailVerifiedAt,
        },
      ],
      Program: [program],
      StudentApplication: [{ ...application }],
      AcademicYear: [academicYear],
      AcademicTerm: [academicTerm],
    });
    const service = new StudentApplicationsService(database);

    await expect(
      service.approve(application.id, approvalDto()),
    ).resolves.toMatchObject({
      application: { status: 'APPROVED', rejectionReason: null },
      student: {
        userId: applicant.id,
        programId: program.id,
        admissionAcademicYearId: academicYear.id,
        status: 'ACTIVE',
      },
    });
    expect(state.Student).toHaveLength(1);
    expect(state.StudentAcademicStanding).toMatchObject([
      {
        studentId: state.Student[0]?.id,
        academicTermId: academicTerm.id,
        programYear: 1,
      },
    ]);
    expect(state.StudentApplication[0]?.studentId).toBe(state.Student[0]?.id);
  });

  it('rejects approval unless the application is UNDER_REVIEW', async () => {
    const { database } = createDatabase({
      StudentApplication: [{ ...application, status: 'PENDING' }],
    });
    const service = new StudentApplicationsService(database);

    await expect(
      service.approve(application.id, approvalDto()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an unknown admission AcademicYear', async () => {
    const { database } = createDatabase({
      User: [
        {
          id: applicant.id,
          role: 'STUDENT',
          status: 'ACTIVE',
          emailVerifiedAt: applicant.emailVerifiedAt,
        },
      ],
      Program: [program],
      StudentApplication: [{ ...application }],
      AcademicTerm: [academicTerm],
    });
    const service = new StudentApplicationsService(database);

    await expect(
      service.approve(application.id, approvalDto()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an AcademicTerm from a different admission AcademicYear', async () => {
    const { database } = createDatabase({
      User: [
        {
          id: applicant.id,
          role: 'STUDENT',
          status: 'ACTIVE',
          emailVerifiedAt: applicant.emailVerifiedAt,
        },
      ],
      Program: [program],
      StudentApplication: [{ ...application }],
      AcademicYear: [academicYear],
      AcademicTerm: [{ ...academicTerm, academicYearId: 'other-year' }],
    });
    const service = new StudentApplicationsService(database);

    await expect(
      service.approve(application.id, approvalDto()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects programYear beyond the Program duration', async () => {
    const { database } = createDatabase({
      User: [
        {
          id: applicant.id,
          role: 'STUDENT',
          status: 'ACTIVE',
          emailVerifiedAt: applicant.emailVerifiedAt,
        },
      ],
      Program: [program],
      StudentApplication: [{ ...application }],
      AcademicYear: [academicYear],
      AcademicTerm: [academicTerm],
    });
    const service = new StudentApplicationsService(database);

    await expect(
      service.approve(application.id, approvalDto({ programYear: 5 })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate studentNumber', async () => {
    const { database } = createDatabase({
      User: [
        {
          id: applicant.id,
          role: 'STUDENT',
          status: 'ACTIVE',
          emailVerifiedAt: applicant.emailVerifiedAt,
        },
      ],
      Program: [program],
      StudentApplication: [{ ...application }],
      Student: [
        { id: 'other-student', userId: 'other-user', studentNumber: 'S-001' },
      ],
      AcademicYear: [academicYear],
      AcademicTerm: [academicTerm],
    });
    const service = new StudentApplicationsService(database);

    await expect(
      service.approve(application.id, approvalDto()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rolls back the Student when creating the initial Standing fails', async () => {
    const { database, state } = createDatabase(
      {
        User: [
          {
            id: applicant.id,
            role: 'STUDENT',
            status: 'ACTIVE',
            emailVerifiedAt: applicant.emailVerifiedAt,
          },
        ],
        Program: [program],
        StudentApplication: [{ ...application }],
        AcademicYear: [academicYear],
        AcademicTerm: [academicTerm],
      },
      'StudentAcademicStanding',
    );
    const service = new StudentApplicationsService(database);

    await expect(
      service.approve(application.id, approvalDto()),
    ).rejects.toThrow();
    expect(state.Student).toHaveLength(0);
    expect(state.StudentAcademicStanding).toHaveLength(0);
    expect(state.StudentApplication[0]?.status).toBe('UNDER_REVIEW');
  });
});
