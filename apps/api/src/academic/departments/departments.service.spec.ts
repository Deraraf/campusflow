import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { DepartmentsService } from './departments.service.js';

function createDatabase(seed: Record<string, Record<string, unknown>[]>) {
  const state: Record<string, Record<string, unknown>[]> = {
    College: (seed.College ?? []).map((row) => ({ ...row })),
    Department: (seed.Department ?? []).map((row) => ({ ...row })),
    Instructor: (seed.Instructor ?? []).map((row) => ({ ...row })),
    Program: (seed.Program ?? []).map((row) => ({ ...row })),
  };
  let nextDepartmentId = 1;

  const tables = Object.fromEntries(
    Object.entries(state).map(([tableName, rows]) => {
      const table = {
        where: vi.fn((criteria: Record<string, unknown>) => {
          const matches = (row: Record<string, unknown>) =>
            Object.entries(criteria).every(
              ([key, value]) => row[key] === value,
            );
          const query = {
            select: vi.fn(() => query),
            include: vi.fn(() => query),
            all: () => ({
              first: async () => rows.find(matches) ?? null,
            }),
            first: async () => rows.find(matches) ?? null,
            update: async (values: Record<string, unknown>) => {
              const row = rows.find(matches);
              if (row === undefined) {
                return null;
              }
              Object.assign(row, values);
              return row;
            },
            delete: async () => {
              const index = rows.findIndex(matches);
              return index < 0 ? null : rows.splice(index, 1)[0];
            },
          };
          return query;
        }),
        create: async (values: Record<string, unknown>) => {
          const row = {
            id: `new-department-${nextDepartmentId++}`,
            ...values,
          };
          rows.push(row);
          return row;
        },
      };
      return [tableName, table];
    }),
  );

  const client = { orm: { public: tables } };

  return {
    database: { client } as unknown as DatabaseService,
    state,
    tables,
  };
}

const college = { id: 'college-1' };
const department = {
  id: 'department-1',
  name: 'Electrical Engineering',
  code: 'ECE',
  collegeId: college.id,
  headInstructorId: null,
};

function createDto(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Electrical Engineering',
    code: 'ECE',
    collegeId: college.id,
    ...overrides,
  };
}

describe('DepartmentsService', () => {
  it('rejects creation when the College does not exist', async () => {
    const { database } = createDatabase({});
    const service = new DepartmentsService(database);

    await expect(service.create(createDto())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    [
      { name: 'Electrical Engineering', code: 'OTHER' },
      'Department name already exists',
    ],
    [
      { name: 'Other Department', code: 'ECE' },
      'Department code already exists',
    ],
  ])('rejects duplicate %s', async (existingDepartment, _message) => {
    const { database } = createDatabase({
      College: [college],
      Department: [{ ...existingDepartment, id: 'existing-department' }],
    });
    const service = new DepartmentsService(database);

    await expect(service.create(createDto())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('creates a Department without a Head', async () => {
    const { database, state } = createDatabase({ College: [college] });
    const service = new DepartmentsService(database);

    await expect(service.create(createDto())).resolves.toMatchObject({
      name: 'Electrical Engineering',
      code: 'ECE',
      collegeId: college.id,
      headInstructorId: null,
    });

    expect(state.Department).toHaveLength(1);
  });

  it('assigns a Head through PATCH when the Instructor belongs to the Department', async () => {
    const { database } = createDatabase({
      Department: [department],
      Instructor: [{ id: 'instructor-1', departmentId: department.id }],
    });
    const service = new DepartmentsService(database);

    await expect(
      service.update(department.id, { headInstructorId: 'instructor-1' }),
    ).resolves.toMatchObject({ headInstructorId: 'instructor-1' });
  });

  it('rejects a Head from another Department through PATCH', async () => {
    const { database } = createDatabase({
      Department: [department],
      Instructor: [
        { id: 'instructor-1', departmentId: 'department-elsewhere' },
      ],
    });
    const service = new DepartmentsService(database);

    await expect(
      service.update(department.id, { headInstructorId: 'instructor-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a Head assignment when the Instructor is already Head elsewhere', async () => {
    const { database } = createDatabase({
      College: [college],
      Department: [
        department,
        { ...department, id: 'department-2', headInstructorId: 'instructor-1' },
      ],
      Instructor: [{ id: 'instructor-1', departmentId: department.id }],
    });
    const service = new DepartmentsService(database);

    await expect(
      service.update(department.id, { headInstructorId: 'instructor-1' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks deletion when Programs exist', async () => {
    const { database } = createDatabase({
      Department: [department],
      Program: [{ id: 'program-1', departmentId: department.id }],
    });
    const service = new DepartmentsService(database);

    await expect(service.remove(department.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('blocks deletion when Instructors exist', async () => {
    const { database } = createDatabase({
      Department: [department],
      Instructor: [{ id: 'instructor-1', departmentId: department.id }],
    });
    const service = new DepartmentsService(database);

    await expect(service.remove(department.id)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
