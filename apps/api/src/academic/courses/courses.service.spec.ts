import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { CoursesService } from './courses.service.js';

function createDatabase(seed: Record<string, Record<string, unknown>[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};
  for (const name of ['Course', 'CurriculumCourse', 'CourseOffering']) {
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
            all: () => ({ first: async () => rows.find(matches) ?? null }),
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
          const row = { id: `course-${generatedId++}`, ...values };
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

const course = {
  id: 'course-1',
  code: 'MATH101',
  title: 'Mathematics I',
  description: null,
};

function createCourseDto(overrides: Record<string, unknown> = {}) {
  return { code: course.code, title: course.title, ...overrides };
}

describe('CoursesService', () => {
  it('creates a Course without creating curriculum records', async () => {
    const { database, state } = createDatabase({});
    const service = new CoursesService(database);

    await expect(service.create(createCourseDto())).resolves.toMatchObject({
      code: 'MATH101',
      title: 'Mathematics I',
    });
    expect(state.CurriculumCourse).toHaveLength(0);
  });

  it('rejects required values that contain only whitespace', async () => {
    const { database } = createDatabase({});
    const service = new CoursesService(database);

    await expect(
      service.create(createCourseDto({ code: '   ' })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate Course codes', async () => {
    const { database } = createDatabase({ Course: [{ ...course }] });
    const service = new CoursesService(database);

    await expect(service.create(createCourseDto())).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('updates Course catalog fields', async () => {
    const { database } = createDatabase({ Course: [{ ...course }] });
    const service = new CoursesService(database);

    await expect(
      service.update(course.id, { title: 'Mathematics Foundations' }),
    ).resolves.toMatchObject({ title: 'Mathematics Foundations' });
  });

  it.each(['CurriculumCourse', 'CourseOffering'])(
    'blocks deletion when referenced by %s',
    async (table) => {
      const { database } = createDatabase({
        Course: [{ ...course }],
        [table]: [{ id: `${table}-1`, courseId: course.id }],
      });
      const service = new CoursesService(database);

      await expect(service.remove(course.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    },
  );
});
