import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { StudentAcademicStandingsService } from './student-academic-standings.service.js';

function createDatabase(seed: Record<string, Record<string, unknown>[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};
  for (const name of [
    'Student',
    'Program',
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
            delete: async () => {
              const index = rows.findIndex(matches);
              return index < 0 ? null : rows.splice(index, 1)[0];
            },
          };
          return query;
        },
        create: async (values: Record<string, unknown>) => {
          const row = { id: `standing-${generatedId++}`, ...values };
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

const student = { id: 'student-1', programId: 'program-1' };
const program = { id: 'program-1', durationYears: 4 };
const term = { id: 'term-1', isCurrent: true };
const standing = {
  id: 'standing-1',
  studentId: student.id,
  academicTermId: term.id,
  programYear: 2,
};

function createDatabaseSeed(
  overrides: Record<string, Record<string, unknown>[]>,
) {
  return {
    Student: [student],
    Program: [program],
    AcademicTerm: [term],
    ...overrides,
  };
}

describe('StudentAcademicStandingsService', () => {
  it('rejects a missing Student', async () => {
    const { database } = createDatabase({});
    const service = new StudentAcademicStandingsService(database);

    await expect(
      service.create(student.id, { academicTermId: term.id, programYear: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects a missing AcademicTerm', async () => {
    const { database } = createDatabase(
      createDatabaseSeed({ AcademicTerm: [] }),
    );
    const service = new StudentAcademicStandingsService(database);

    await expect(
      service.create(student.id, { academicTermId: term.id, programYear: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([0, 5, 2.5])(
    'rejects invalid programYear %s',
    async (programYear) => {
      const { database } = createDatabase(createDatabaseSeed({}));
      const service = new StudentAcademicStandingsService(database);

      await expect(
        service.create(student.id, { academicTermId: term.id, programYear }),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejects duplicate Student + AcademicTerm standing', async () => {
    const { database } = createDatabase(
      createDatabaseSeed({ StudentAcademicStanding: [{ ...standing }] }),
    );
    const service = new StudentAcademicStandingsService(database);

    await expect(
      service.create(student.id, { academicTermId: term.id, programYear: 2 }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a standing successfully', async () => {
    const { database, state } = createDatabase(createDatabaseSeed({}));
    const service = new StudentAcademicStandingsService(database);

    await expect(
      service.create(student.id, { academicTermId: term.id, programYear: 1 }),
    ).resolves.toMatchObject({ academicTermId: term.id, programYear: 1 });
    expect(state.StudentAcademicStanding).toHaveLength(1);
  });

  it('updates term and program year without changing the Student', async () => {
    const { database } = createDatabase(
      createDatabaseSeed({
        AcademicTerm: [term, { id: 'term-2', isCurrent: false }],
        StudentAcademicStanding: [{ ...standing }],
      }),
    );
    const service = new StudentAcademicStandingsService(database);

    await expect(
      service.update(student.id, standing.id, {
        academicTermId: 'term-2',
        programYear: 3,
      }),
    ).resolves.toMatchObject({
      studentId: student.id,
      academicTermId: 'term-2',
      programYear: 3,
    });
  });

  it('returns the standing for the globally current AcademicTerm', async () => {
    const { database } = createDatabase(
      createDatabaseSeed({ StudentAcademicStanding: [{ ...standing }] }),
    );
    const service = new StudentAcademicStandingsService(database);

    await expect(service.getCurrent(student.id)).resolves.toMatchObject({
      studentId: student.id,
      academicTermId: term.id,
    });
  });

  it('returns 404 when current-term standing is missing', async () => {
    const { database } = createDatabase(createDatabaseSeed({}));
    const service = new StudentAcademicStandingsService(database);

    await expect(service.getCurrent(student.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('deletes a standing without deleting the Student', async () => {
    const { database, state } = createDatabase(
      createDatabaseSeed({ StudentAcademicStanding: [{ ...standing }] }),
    );
    const service = new StudentAcademicStandingsService(database);

    await expect(
      service.remove(student.id, standing.id),
    ).resolves.toMatchObject({ id: standing.id });
    expect(state.Student).toHaveLength(1);
    expect(state.StudentAcademicStanding).toHaveLength(0);
  });
});
