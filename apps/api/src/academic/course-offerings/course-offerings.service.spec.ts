import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { CourseMeetingsService } from '../course-meetings/course-meetings.service.js';
import { CourseOfferingsService } from './course-offerings.service.js';

function createDatabase(seed: Record<string, Record<string, unknown>[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};
  const names = [
    'Course',
    'AcademicTerm',
    'Instructor',
    'CourseOffering',
    'CourseMeeting',
    'Enrollment',
    'Assignment',
    'Exam',
    'Attendance',
  ];
  for (const name of names)
    state[name] = (seed[name] ?? []).map((row) => ({ ...row }));
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

const course = { id: 'course-1', code: 'MATH101', title: 'Mathematics I' };
const term = { id: 'term-1', academicYearId: 'year-1', semester: 'FIRST' };
const instructor = { id: 'instructor-1', departmentId: 'department-1' };
const offering = {
  id: 'offering-1',
  courseId: course.id,
  academicTermId: term.id,
  instructorId: instructor.id,
  section: 'A',
  capacity: null,
};

function createOfferingDto(overrides: Record<string, unknown> = {}) {
  return {
    academicTermId: term.id,
    instructorId: instructor.id,
    section: 'A',
    ...overrides,
  };
}

const missingReferenceCases: Array<{
  label: string;
  seed: Record<string, Record<string, unknown>[]>;
}> = [
  { label: 'Course', seed: {} },
  { label: 'AcademicTerm', seed: { Course: [course] } },
  {
    label: 'Instructor',
    seed: { Course: [course], AcademicTerm: [term] },
  },
];

describe('CourseOfferingsService', () => {
  it.each(missingReferenceCases)(
    'rejects a missing $label reference',
    async ({ seed }) => {
      const { database } = createDatabase(seed);
      const service = new CourseOfferingsService(
        database,
        new CourseMeetingsService(database),
      );

      await expect(
        service.create(course.id, createOfferingDto()),
      ).rejects.toBeInstanceOf(NotFoundException);
    },
  );

  it('rejects an invalid capacity', async () => {
    const { database } = createDatabase({
      Course: [course],
      AcademicTerm: [term],
      Instructor: [instructor],
    });
    const service = new CourseOfferingsService(
      database,
      new CourseMeetingsService(database),
    );

    await expect(
      service.create(course.id, createOfferingDto({ capacity: 0 })),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate Course/term/section tuples', async () => {
    const { database } = createDatabase({
      Course: [course],
      AcademicTerm: [term],
      Instructor: [instructor],
      CourseOffering: [{ ...offering }],
    });
    const service = new CourseOfferingsService(
      database,
      new CourseMeetingsService(database),
    );

    await expect(
      service.create(course.id, createOfferingDto()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates an offering with route Course ID and optional capacity', async () => {
    const { database, state } = createDatabase({
      Course: [course],
      AcademicTerm: [term],
      Instructor: [instructor],
    });
    const service = new CourseOfferingsService(
      database,
      new CourseMeetingsService(database),
    );

    await expect(
      service.create(course.id, createOfferingDto({ capacity: 30 })),
    ).resolves.toMatchObject({
      courseId: course.id,
      academicTermId: term.id,
      instructorId: instructor.id,
      section: 'A',
      capacity: 30,
    });
    expect(state.CourseOffering).toHaveLength(1);
  });

  it('updates offering details', async () => {
    const { database } = createDatabase({ CourseOffering: [{ ...offering }] });
    const service = new CourseOfferingsService(
      database,
      new CourseMeetingsService(database),
    );

    await expect(
      service.update(offering.id, { section: 'B', capacity: 24 }),
    ).resolves.toMatchObject({ section: 'B', capacity: 24 });
  });

  it('rejects an Instructor change that would create a schedule conflict', async () => {
    const otherInstructor = { id: 'instructor-2' };
    const { database } = createDatabase({
      Instructor: [instructor, otherInstructor],
      CourseOffering: [
        { ...offering },
        { ...offering, id: 'offering-2', instructorId: otherInstructor.id },
      ],
      CourseMeeting: [
        {
          id: 'meeting-1',
          offeringId: offering.id,
          dayOfWeek: 'MONDAY',
          startTime: '08:00',
          endTime: '10:00',
        },
        {
          id: 'meeting-2',
          offeringId: 'offering-2',
          dayOfWeek: 'MONDAY',
          startTime: '09:00',
          endTime: '11:00',
        },
      ],
    });
    const service = new CourseOfferingsService(
      database,
      new CourseMeetingsService(database),
    );

    await expect(
      service.update(offering.id, { instructorId: otherInstructor.id }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it.each(['Enrollment', 'Assignment', 'Exam', 'Attendance', 'CourseMeeting'])(
    'blocks deletion when %s records exist',
    async (table) => {
      const { database } = createDatabase({
        CourseOffering: [{ ...offering }],
        [table]: [{ id: `${table}-1`, offeringId: offering.id }],
      });
      const service = new CourseOfferingsService(
        database,
        new CourseMeetingsService(database),
      );

      await expect(service.remove(offering.id)).rejects.toBeInstanceOf(
        ConflictException,
      );
    },
  );

  it('deletes an offering when it has no dependent records', async () => {
    const { database, state } = createDatabase({
      CourseOffering: [{ ...offering }],
    });
    const service = new CourseOfferingsService(
      database,
      new CourseMeetingsService(database),
    );

    await expect(service.remove(offering.id)).resolves.toMatchObject({
      id: offering.id,
    });
    expect(state.CourseOffering).toHaveLength(0);
  });
});
