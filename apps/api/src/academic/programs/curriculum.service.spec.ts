import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { CurriculumService } from './curriculum.service.js';
import { CreateCurriculumCourseDto } from './dto/create-curriculum-course.dto.js';

function createDatabase(seed: Record<string, Record<string, unknown>[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};
  for (const name of ['Program', 'Course', 'CurriculumCourse']) {
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
          const row = { id: `curriculum-${generatedId++}`, ...values };
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

const program = { id: 'program-1', durationYears: 4 };
const course = {
  id: 'course-1',
  code: 'CSE101',
  title: 'Introduction to Computing',
};
const curriculumCourse = {
  id: 'curriculum-1',
  programId: program.id,
  courseId: course.id,
  year: 1,
  semester: 'FIRST',
  credits: 3,
  courseType: 'CORE',
  isRequired: true,
};

function createCurriculumDto(overrides: Record<string, unknown> = {}) {
  return {
    courseId: course.id,
    year: 1,
    semester: 'FIRST',
    credits: 3,
    courseType: 'CORE',
    isRequired: true,
    ...overrides,
  } as CreateCurriculumCourseDto;
}

describe('CurriculumService', () => {
  it('rejects a missing Program', async () => {
    const { database } = createDatabase({ Course: [course] });
    const service = new CurriculumService(database);

    await expect(service.list(program.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a missing Course', async () => {
    const { database } = createDatabase({ Program: [program] });
    const service = new CurriculumService(database);

    await expect(
      service.create(program.id, createCurriculumDto()),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it.each([
    { label: 'invalid year', overrides: { year: 0 } },
    { label: 'non-integer year', overrides: { year: 1.5 } },
    { label: 'year beyond Program duration', overrides: { year: 5 } },
    { label: 'invalid credits', overrides: { credits: 0 } },
    { label: 'invalid semester', overrides: { semester: 'AUTUMN' } },
    { label: 'invalid course type', overrides: { courseType: 'OPTIONAL' } },
    { label: 'non-boolean required flag', overrides: { isRequired: 'true' } },
  ])('rejects $label', async ({ overrides }) => {
    const { database } = createDatabase({
      Program: [program],
      Course: [course],
    });
    const service = new CurriculumService(database);

    await expect(
      service.create(program.id, createCurriculumDto(overrides)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate Program + Course relationships', async () => {
    const { database } = createDatabase({
      Program: [program],
      Course: [course],
      CurriculumCourse: [{ ...curriculumCourse }],
    });
    const service = new CurriculumService(database);

    await expect(
      service.create(program.id, createCurriculumDto()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a curriculum course successfully', async () => {
    const { database, state } = createDatabase({
      Program: [program],
      Course: [course],
    });
    const service = new CurriculumService(database);

    await expect(
      service.create(program.id, createCurriculumDto()),
    ).resolves.toMatchObject({
      programId: program.id,
      courseId: course.id,
      year: 1,
    });
    expect(state.CurriculumCourse).toHaveLength(1);
  });

  it('updates curriculum fields without changing courseId', async () => {
    const { database } = createDatabase({
      Program: [program],
      Course: [course],
      CurriculumCourse: [{ ...curriculumCourse }],
    });
    const service = new CurriculumService(database);

    await expect(
      service.update(program.id, curriculumCourse.id, {
        year: 2,
        semester: 'SECOND',
        isRequired: false,
      }),
    ).resolves.toMatchObject({
      courseId: course.id,
      year: 2,
      semester: 'SECOND',
      isRequired: false,
    });
  });

  it('rejects updates when year exceeds Program duration', async () => {
    const { database } = createDatabase({
      Program: [program],
      Course: [course],
      CurriculumCourse: [{ ...curriculumCourse }],
    });
    const service = new CurriculumService(database);

    await expect(
      service.update(program.id, curriculumCourse.id, { year: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('deletes a curriculum course successfully', async () => {
    const { database, state } = createDatabase({
      Program: [program],
      CurriculumCourse: [{ ...curriculumCourse }],
    });
    const service = new CurriculumService(database);

    await expect(
      service.remove(program.id, curriculumCourse.id),
    ).resolves.toMatchObject({ id: curriculumCourse.id });
    expect(state.CurriculumCourse).toHaveLength(0);
  });
});
