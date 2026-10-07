import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { DatabaseService } from '../../database/database.service.js';
import { CourseMeetingsService } from './course-meetings.service.js';
import { CreateCourseMeetingDto } from './dto/create-course-meeting.dto.js';

function createDatabase(seed: Record<string, Record<string, unknown>[]>) {
  const state: Record<string, Record<string, unknown>[]> = {};
  for (const name of ['CourseOffering', 'CourseMeeting']) {
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
          const row = {
            id: `meeting-${generatedId++}`,
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
  return {
    database: {
      client: { orm: { public: tables } },
    } as unknown as DatabaseService,
    state,
  };
}

const offering = {
  id: 'offering-1',
  instructorId: 'instructor-1',
  academicTermId: 'term-1',
};
const meeting = {
  id: 'meeting-1',
  offeringId: offering.id,
  dayOfWeek: 'MONDAY',
  startTime: '08:00',
  endTime: '10:00',
  room: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function meetingDto(
  overrides: Record<string, unknown> = {},
): CreateCourseMeetingDto {
  return {
    dayOfWeek: 'MONDAY',
    startTime: '08:00',
    endTime: '10:00',
    ...overrides,
  } as CreateCourseMeetingDto;
}

describe('CourseMeetingsService', () => {
  it('rejects a missing CourseOffering', async () => {
    const { database } = createDatabase({});
    const service = new CourseMeetingsService(database);

    await expect(service.list(offering.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it.each([
    { label: 'invalid day', values: { dayOfWeek: 'FUNDAY' } },
    { label: 'invalid HH:mm', values: { startTime: '8:00' } },
    {
      label: 'end before start',
      values: { startTime: '11:00', endTime: '10:00' },
    },
  ])('rejects $label', async ({ values }) => {
    const { database } = createDatabase({ CourseOffering: [{ ...offering }] });
    const service = new CourseMeetingsService(database);

    await expect(
      service.create(offering.id, meetingDto(values)),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates a normalized CourseMeeting', async () => {
    const { database, state } = createDatabase({
      CourseOffering: [{ ...offering }],
    });
    const service = new CourseMeetingsService(database);

    await expect(
      service.create(offering.id, meetingDto({ startTime: ' 08:00 ' })),
    ).resolves.toMatchObject({ startTime: '08:00', room: null });
    expect(state.CourseMeeting).toHaveLength(1);
  });

  it('rejects duplicate meeting tuples', async () => {
    const { database } = createDatabase({
      CourseOffering: [{ ...offering }],
      CourseMeeting: [{ ...meeting }],
    });
    const service = new CourseMeetingsService(database);

    await expect(
      service.create(offering.id, meetingDto()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a meeting while preserving its offering', async () => {
    const { database } = createDatabase({
      CourseOffering: [{ ...offering }],
      CourseMeeting: [{ ...meeting }],
    });
    const service = new CourseMeetingsService(database);

    await expect(
      service.update(offering.id, meeting.id, {
        startTime: '09:00',
        endTime: '11:00',
      }),
    ).resolves.toMatchObject({
      offeringId: offering.id,
      startTime: '09:00',
      endTime: '11:00',
    });
  });

  it('rejects a meeting update that overlaps another offering', async () => {
    const { database } = createDatabase({
      CourseOffering: [{ ...offering }, { ...offering, id: 'offering-2' }],
      CourseMeeting: [
        { ...meeting },
        {
          ...meeting,
          id: 'meeting-2',
          offeringId: 'offering-2',
          startTime: '10:00',
          endTime: '12:00',
        },
      ],
    });
    const service = new CourseMeetingsService(database);

    await expect(
      service.update(offering.id, meeting.id, {
        startTime: '09:00',
        endTime: '11:00',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns 404 when the meeting belongs to a different offering', async () => {
    const { database } = createDatabase({
      CourseOffering: [{ ...offering }, { ...offering, id: 'offering-2' }],
      CourseMeeting: [{ ...meeting }],
    });
    const service = new CourseMeetingsService(database);

    await expect(
      service.update('offering-2', meeting.id, { room: '201' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.remove('offering-2', meeting.id),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes a meeting successfully', async () => {
    const { database, state } = createDatabase({
      CourseOffering: [{ ...offering }],
      CourseMeeting: [{ ...meeting }],
    });
    const service = new CourseMeetingsService(database);

    await expect(
      service.remove(offering.id, meeting.id),
    ).resolves.toMatchObject({ id: meeting.id });
    expect(state.CourseMeeting).toHaveLength(0);
  });

  it('rejects overlapping meetings for the same Instructor and AcademicTerm', async () => {
    const { database } = createDatabase({
      CourseOffering: [{ ...offering }, { ...offering, id: 'offering-2' }],
      CourseMeeting: [
        {
          ...meeting,
          offeringId: 'offering-2',
          startTime: '09:00',
          endTime: '11:00',
        },
      ],
    });
    const service = new CourseMeetingsService(database);

    await expect(
      service.create(offering.id, meetingDto()),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('allows non-overlapping meetings for the same Instructor and AcademicTerm', async () => {
    const { database } = createDatabase({
      CourseOffering: [{ ...offering }, { ...offering, id: 'offering-2' }],
      CourseMeeting: [
        {
          ...meeting,
          offeringId: 'offering-2',
          startTime: '10:00',
          endTime: '11:00',
        },
      ],
    });
    const service = new CourseMeetingsService(database);

    await expect(
      service.create(offering.id, meetingDto()),
    ).resolves.toMatchObject({ startTime: '08:00', endTime: '10:00' });
  });

  it('allows same-time meetings in different AcademicTerms', async () => {
    const { database } = createDatabase({
      CourseOffering: [
        { ...offering },
        { ...offering, id: 'offering-2', academicTermId: 'term-2' },
      ],
      CourseMeeting: [{ ...meeting, offeringId: 'offering-2' }],
    });
    const service = new CourseMeetingsService(database);

    await expect(
      service.create(offering.id, meetingDto()),
    ).resolves.toMatchObject({ startTime: '08:00', endTime: '10:00' });
  });

  it('allows same-time meetings for different Instructors', async () => {
    const { database } = createDatabase({
      CourseOffering: [
        { ...offering },
        { ...offering, id: 'offering-2', instructorId: 'instructor-2' },
      ],
      CourseMeeting: [{ ...meeting, offeringId: 'offering-2' }],
    });
    const service = new CourseMeetingsService(database);

    await expect(
      service.create(offering.id, meetingDto()),
    ).resolves.toMatchObject({ startTime: '08:00', endTime: '10:00' });
  });
});
