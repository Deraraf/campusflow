import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { ProgramsService } from './programs.service.js';

function createDatabase(seed: Record<string, Record<string, unknown>[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};
  for (const name of [
    'Program',
    'Department',
    'Instructor',
    'CurriculumCourse',
    'Student',
    'StudentApplication',
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

const department = { id: 'department-1', name: 'Engineering', code: 'ENG' };
const instructor = { id: 'instructor-1', departmentId: department.id };
const program = {
  id: 'program-1',
  name: 'Software Engineering',
  code: 'BSE',
  departmentId: department.id,
  durationYears: 4,
  coordinatorInstructorId: null,
};

function createProgramDto(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Software Engineering',
    code: 'BSE',
    departmentId: department.id,
    durationYears: 4,
    ...overrides,
  };
}

describe('ProgramsService', () => {
  it('rejects creation when the Department does not exist', async () => {
    const { database } = createDatabase({});
    const service = new ProgramsService(database);

    await expect(service.create(createProgramDto())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects duplicate Program codes', async () => {
    const { database } = createDatabase({
      Department: [department],
      Program: [{ ...program }],
    });
    const service = new ProgramsService(database);

    await expect(service.create(createProgramDto())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it.each([0, 11, 2.5])(
    'rejects invalid durationYears value %s',
    async (durationYears) => {
      const { database } = createDatabase({ Department: [department] });
      const service = new ProgramsService(database);

      await expect(
        service.create(createProgramDto({ durationYears })),
      ).rejects.toBeInstanceOf(BadRequestException);
    },
  );

  it('rejects a coordinator that is not an existing Instructor', async () => {
    const { database } = createDatabase({ Program: [{ ...program }] });
    const service = new ProgramsService(database);

    await expect(
      service.update(program.id, { coordinatorInstructorId: 'missing' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('assigns a same-Department Instructor as Coordinator', async () => {
    const { database } = createDatabase({
      Program: [{ ...program }],
      Instructor: [{ ...instructor }],
    });
    const service = new ProgramsService(database);

    await expect(
      service.update(program.id, {
        coordinatorInstructorId: instructor.id,
      }),
    ).resolves.toMatchObject({ coordinatorInstructorId: instructor.id });
  });

  it('removes the Program Coordinator when PATCH sets it to null', async () => {
    const { database } = createDatabase({
      Program: [{ ...program, coordinatorInstructorId: instructor.id }],
    });
    const service = new ProgramsService(database);

    await expect(
      service.update(program.id, { coordinatorInstructorId: null }),
    ).resolves.toMatchObject({ coordinatorInstructorId: null });
  });

  it('rejects a coordinator from another Department', async () => {
    const { database } = createDatabase({
      Program: [{ ...program }],
      Instructor: [{ ...instructor, departmentId: 'department-elsewhere' }],
    });
    const service = new ProgramsService(database);

    await expect(
      service.update(program.id, {
        coordinatorInstructorId: instructor.id,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an Instructor who coordinates another Program', async () => {
    const { database } = createDatabase({
      Program: [
        { ...program },
        {
          ...program,
          id: 'program-2',
          code: 'BSE2',
          coordinatorInstructorId: instructor.id,
        },
      ],
      Instructor: [{ ...instructor }],
    });
    const service = new ProgramsService(database);

    await expect(
      service.update(program.id, {
        coordinatorInstructorId: instructor.id,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('requires an explicit coordinator clear or replacement when changing Department', async () => {
    const { database } = createDatabase({
      Department: [
        department,
        { id: 'department-2', name: 'Science', code: 'SCI' },
      ],
      Program: [{ ...program, coordinatorInstructorId: instructor.id }],
    });
    const service = new ProgramsService(database);

    await expect(
      service.update(program.id, { departmentId: 'department-2' }),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.update(program.id, {
        departmentId: 'department-2',
        coordinatorInstructorId: null,
      }),
    ).resolves.toMatchObject({
      departmentId: 'department-2',
      coordinatorInstructorId: null,
    });
  });

  it('rejects shortening duration below an existing curriculum year', async () => {
    const { database } = createDatabase({
      Program: [{ ...program }],
      CurriculumCourse: [
        { id: 'curriculum-1', programId: program.id, year: 4 },
      ],
    });
    const service = new ProgramsService(database);

    await expect(
      service.update(program.id, { durationYears: 3 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each(['CurriculumCourse', 'Student', 'StudentApplication'])(
    'blocks deletion when %s dependents exist',
    async (table) => {
      const { database } = createDatabase({
        Program: [{ ...program }],
        [table]: [{ id: `${table}-1`, programId: program.id }],
      });
      const service = new ProgramsService(database);

      await expect(service.remove(program.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    },
  );
});
