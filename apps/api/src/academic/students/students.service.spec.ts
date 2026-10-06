import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { StudentsService } from './students.service.js';

function createDatabase(seed: Record<string, Record<string, unknown>[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};
  for (const name of [
    'Student',
    'Program',
    'Department',
    'User',
    'AcademicYear',
    'AcademicTerm',
    'StudentAcademicStanding',
  ]) {
    state[name] = (seed[name] ?? []).map((row) => ({ ...row }));
  }
  const tables = Object.fromEntries(
    Object.entries(state).map(([name, rows]) => [
      name,
      {
        select: () => {
          const query = {
            include: () => query,
            all: async () => rows,
          };
          return query;
        },
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

const student = {
  id: 'student-1',
  userId: 'user-1',
  studentNumber: 'S-001',
  programId: 'program-1',
  admissionAcademicYearId: 'year-1',
  status: 'ACTIVE',
};

describe('StudentsService', () => {
  it('lists safe Student summaries with the standing for the current term', async () => {
    const { database } = createDatabase({
      Student: [student],
      AcademicTerm: [{ id: 'term-current', isCurrent: true }],
      StudentAcademicStanding: [
        {
          id: 'standing-1',
          studentId: student.id,
          academicTermId: 'term-current',
          programYear: 2,
        },
      ],
    });
    const service = new StudentsService(database);

    await expect(service.list()).resolves.toMatchObject([
      {
        id: student.id,
        studentNumber: student.studentNumber,
        currentAcademicStanding: {
          academicTermId: 'term-current',
          programYear: 2,
        },
      },
    ]);
  });

  it('returns a Student record by authenticated user ID', async () => {
    const { database } = createDatabase({ Student: [student] });
    const service = new StudentsService(database);

    await expect(service.getMine(student.userId)).resolves.toMatchObject({
      id: student.id,
      userId: student.userId,
    });
  });

  it('returns a clean 404 when the account has no Student record', async () => {
    const { database } = createDatabase({ Student: [] });
    const service = new StudentsService(database);

    await expect(service.getMine('no-student-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('does not return another Student by a different user ID', async () => {
    const { database } = createDatabase({ Student: [student] });
    const service = new StudentsService(database);

    await expect(service.getMine('another-user')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('updates only the Student status', async () => {
    const { database, state } = createDatabase({ Student: [student] });
    const service = new StudentsService(database);

    await expect(
      service.updateStatus(student.id, 'SUSPENDED'),
    ).resolves.toMatchObject({ status: 'SUSPENDED' });
    expect(state.Student[0]?.programId).toBe(student.programId);
  });
});
