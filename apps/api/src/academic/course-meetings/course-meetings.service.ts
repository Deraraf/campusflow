import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import {
  CreateCourseMeetingDto,
  DAYS_OF_WEEK,
} from './dto/create-course-meeting.dto.js';
import { UpdateCourseMeetingDto } from './dto/update-course-meeting.dto.js';

type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export type CourseMeetingResponse = {
  id: string;
  offeringId: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  room: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class CourseMeetingsService {
  constructor(private readonly database: DatabaseService) {}

  async list(offeringId: string) {
    await this.getOffering(offeringId);
    return this.database.client.orm.public.CourseMeeting.where({ offeringId })
      .select(
        'id',
        'offeringId',
        'dayOfWeek',
        'startTime',
        'endTime',
        'room',
        'createdAt',
        'updatedAt',
      )
      .all();
  }

  async create(
    offeringId: string,
    dto: CreateCourseMeetingDto,
  ): Promise<CourseMeetingResponse> {
    const offering = await this.getOffering(offeringId);
    const values = this.normalizeAndValidate(dto);
    await this.ensureUniqueMeeting(offeringId, values);
    await this.ensureMeetingScheduleAvailable(offering, values);

    try {
      const meeting =
        await this.database.client.orm.public.CourseMeeting.create({
          offeringId,
          ...values,
        });
      return meeting;
    } catch (error) {
      this.handleDatabaseError(error, 'create');
    }
  }

  async update(
    offeringId: string,
    id: string,
    dto: UpdateCourseMeetingDto,
  ): Promise<CourseMeetingResponse> {
    const offering = await this.getOffering(offeringId);
    const existing = await this.getMeeting(offeringId, id);
    const values = this.normalizeAndValidate({
      dayOfWeek: dto.dayOfWeek ?? existing.dayOfWeek,
      startTime: dto.startTime ?? existing.startTime,
      endTime: dto.endTime ?? existing.endTime,
      room: dto.room === undefined ? existing.room : dto.room,
    });

    await this.ensureUniqueMeeting(offeringId, values, id);
    await this.ensureMeetingScheduleAvailable(offering, values, id);

    const update: {
      dayOfWeek?: DayOfWeek;
      startTime?: string;
      endTime?: string;
      room?: string | null;
    } = {};
    if (dto.dayOfWeek !== undefined) update.dayOfWeek = values.dayOfWeek;
    if (dto.startTime !== undefined) update.startTime = values.startTime;
    if (dto.endTime !== undefined) update.endTime = values.endTime;
    if (dto.room !== undefined) update.room = values.room;

    if (Object.keys(update).length === 0) return existing;

    try {
      const updated = await this.database.client.orm.public.CourseMeeting.where(
        {
          id,
          offeringId,
        },
      ).update(update);
      if (updated === null) {
        throw new NotFoundException('Course meeting not found');
      }
      return updated;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleDatabaseError(error, 'update');
    }
  }

  async remove(offeringId: string, id: string) {
    await this.getOffering(offeringId);
    await this.getMeeting(offeringId, id);

    try {
      const removed = await this.database.client.orm.public.CourseMeeting.where(
        {
          id,
          offeringId,
        },
      ).delete();
      if (removed === null) {
        throw new NotFoundException('Course meeting not found');
      }
      return {
        id: removed.id,
        offeringId: removed.offeringId,
        dayOfWeek: removed.dayOfWeek,
        startTime: removed.startTime,
        endTime: removed.endTime,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleDatabaseError(error, 'delete');
    }
  }

  async assertOfferingScheduleAvailable(
    offeringId: string,
    instructorId: string,
    academicTermId: string,
  ): Promise<void> {
    const targetMeetings =
      await this.database.client.orm.public.CourseMeeting.where({
        offeringId,
      }).all();

    for (
      let firstIndex = 0;
      firstIndex < targetMeetings.length;
      firstIndex += 1
    ) {
      for (
        let secondIndex = firstIndex + 1;
        secondIndex < targetMeetings.length;
        secondIndex += 1
      ) {
        if (
          this.overlaps(
            targetMeetings[firstIndex]!,
            targetMeetings[secondIndex]!,
          )
        ) {
          throw new ConflictException(
            'Instructor has overlapping CourseOffering meetings in this AcademicTerm',
          );
        }
      }
    }

    const peerOfferings =
      await this.database.client.orm.public.CourseOffering.where({
        instructorId,
        academicTermId,
      })
        .select('id')
        .all();

    for (const targetMeeting of targetMeetings) {
      for (const peerOffering of peerOfferings) {
        if (peerOffering.id === offeringId) continue;
        const peerMeetings =
          await this.database.client.orm.public.CourseMeeting.where({
            offeringId: peerOffering.id,
            dayOfWeek: targetMeeting.dayOfWeek,
          }).all();

        if (
          peerMeetings.some((peerMeeting) =>
            this.overlaps(targetMeeting, peerMeeting),
          )
        ) {
          throw new ConflictException(
            'Instructor has overlapping CourseOffering meetings in this AcademicTerm',
          );
        }
      }
    }
  }

  private async getOffering(offeringId: string) {
    const offering = await this.database.client.orm.public.CourseOffering.where(
      {
        id: offeringId,
      },
    )
      .select('id', 'instructorId', 'academicTermId')
      .all()
      .first();

    if (offering === null) {
      throw new NotFoundException('Course offering not found');
    }
    return offering;
  }

  private async getMeeting(offeringId: string, id: string) {
    const meeting = await this.database.client.orm.public.CourseMeeting.where({
      id,
      offeringId,
    })
      .all()
      .first();

    if (meeting === null) {
      throw new NotFoundException('Course meeting not found');
    }
    return meeting;
  }

  private normalizeAndValidate(data: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    room?: string | null;
  }) {
    const dayOfWeek = data.dayOfWeek.toUpperCase();
    const startTime = this.normalizeTime(data.startTime);
    const endTime = this.normalizeTime(data.endTime);

    if (this.toMinutes(startTime) >= this.toMinutes(endTime)) {
      throw new BadRequestException('startTime must be before endTime');
    }

    const validDays = [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
      'SATURDAY',
      'SUNDAY',
    ];
    if (!validDays.includes(dayOfWeek)) {
      throw new BadRequestException('Invalid dayOfWeek');
    }

    return {
      dayOfWeek: dayOfWeek as DayOfWeek,
      startTime,
      endTime,
      room:
        data.room == null || data.room.trim() === '' ? null : data.room.trim(),
    };
  }

  private normalizeTime(value: string): string {
    const normalized = value.trim();
    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
      throw new BadRequestException('Time must use HH:mm in 24-hour format');
    }
    return normalized;
  }

  private toMinutes(value: string): number {
    const [hours, minutes] = value.split(':').map(Number);
    return hours! * 60 + minutes!;
  }

  private overlaps(
    first: { dayOfWeek: string; startTime: string; endTime: string },
    second: { dayOfWeek: string; startTime: string; endTime: string },
  ): boolean {
    return (
      first.dayOfWeek === second.dayOfWeek &&
      this.toMinutes(first.startTime) < this.toMinutes(second.endTime) &&
      this.toMinutes(second.startTime) < this.toMinutes(first.endTime)
    );
  }

  private async ensureMeetingScheduleAvailable(
    offering: { id: string; instructorId: string; academicTermId: string },
    values: {
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
    },
    excludeMeetingId?: string,
  ): Promise<void> {
    const offerings =
      await this.database.client.orm.public.CourseOffering.where({
        instructorId: offering.instructorId,
        academicTermId: offering.academicTermId,
      })
        .select('id')
        .all();

    for (const peerOffering of offerings) {
      const peerMeetings =
        await this.database.client.orm.public.CourseMeeting.where({
          offeringId: peerOffering.id,
          dayOfWeek: values.dayOfWeek,
        }).all();

      if (
        peerMeetings.some(
          (meeting) =>
            meeting.id !== excludeMeetingId && this.overlaps(values, meeting),
        )
      ) {
        throw new ConflictException(
          'Instructor has overlapping CourseOffering meetings in this AcademicTerm',
        );
      }
    }
  }

  private async ensureUniqueMeeting(
    offeringId: string,
    values: {
      dayOfWeek: DayOfWeek;
      startTime: string;
      endTime: string;
    },
    excludeMeetingId?: string,
  ): Promise<void> {
    const duplicate = await this.database.client.orm.public.CourseMeeting.where(
      {
        offeringId,
        dayOfWeek: values.dayOfWeek,
        startTime: values.startTime,
        endTime: values.endTime,
      },
    )
      .select('id')
      .all()
      .first();

    if (duplicate !== null && duplicate.id !== excludeMeetingId) {
      throw new ConflictException('Course meeting already exists');
    }
  }

  private handleDatabaseError(error: unknown, operation: string): never {
    const databaseError = error as { code?: string };
    if (databaseError?.code === 'P2002') {
      throw new ConflictException('Course meeting already exists');
    }
    if (databaseError?.code === 'P2003') {
      throw new NotFoundException('Course offering not found');
    }
    throw new InternalServerErrorException(
      `Unable to ${operation} course meeting`,
    );
  }
}
