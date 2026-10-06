import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CourseMeetingsService } from '../course-meetings/course-meetings.service.js';
import { CreateCourseOfferingDto } from './dto/create-course-offering.dto.js';
import { UpdateCourseOfferingDto } from './dto/update-course-offering.dto.js';

@Injectable()
export class CourseOfferingsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly meetingsService: CourseMeetingsService,
  ) {}

  async list() {
    return this.database.client.orm.public.CourseOffering.select(
      'id',
      'courseId',
      'academicTermId',
      'instructorId',
      'section',
      'capacity',
      'createdAt',
      'updatedAt',
    )
      .include('course', (course) => course.select('id', 'code', 'title'))
      .include('academicTerm', (term) =>
        term
          .select('id', 'semester', 'academicYearId')
          .include('academicYear', (year) => year.select('id', 'name')),
      )
      .include('instructor', (instructor) =>
        instructor
          .select('id', 'employeeNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('meetings', (meetings) => meetings.count())
      .include('enrollments', (enrollments) => enrollments.count())
      .all();
  }

  async getById(id: string) {
    const offering = await this.database.client.orm.public.CourseOffering.where(
      {
        id,
      },
    )
      .select(
        'id',
        'courseId',
        'academicTermId',
        'instructorId',
        'section',
        'capacity',
        'createdAt',
        'updatedAt',
      )
      .include('course', (course) => course.select('id', 'code', 'title'))
      .include('academicTerm', (term) =>
        term
          .select('id', 'semester', 'isCurrent', 'academicYearId')
          .include('academicYear', (year) =>
            year.select('id', 'name', 'startDate', 'endDate'),
          ),
      )
      .include('instructor', (instructor) =>
        instructor
          .select('id', 'employeeNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('meetings', (meetings) =>
        meetings.select('id', 'dayOfWeek', 'startTime', 'endTime', 'room'),
      )
      .include('enrollments', (enrollments) => enrollments.count())
      .all()
      .first();

    if (offering === null) {
      throw new NotFoundException('Course offering not found');
    }
    return offering;
  }

  async listByTerm(academicTermId: string) {
    await this.ensureTermExists(academicTermId);

    return this.database.client.orm.public.CourseOffering.where({
      academicTermId,
    })
      .select(
        'id',
        'courseId',
        'academicTermId',
        'instructorId',
        'section',
        'capacity',
        'createdAt',
        'updatedAt',
      )
      .include('course', (course) => course.select('id', 'code', 'title'))
      .include('academicTerm', (term) =>
        term
          .select('id', 'semester', 'academicYearId')
          .include('academicYear', (year) => year.select('id', 'name')),
      )
      .include('instructor', (instructor) =>
        instructor
          .select('id', 'employeeNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('meetings', (meetings) => meetings.count())
      .include('enrollments', (enrollments) => enrollments.count())
      .all();
  }

  async create(courseId: string, dto: CreateCourseOfferingDto) {
    await this.ensureCourseExists(courseId);
    await this.ensureTermExists(dto.academicTermId);
    await this.ensureInstructorExists(dto.instructorId);

    const section = dto.section.trim();
    if (!section) {
      throw new BadRequestException('Course offering section is required');
    }
    this.validateCapacity(dto.capacity);
    await this.ensureUniqueSection(courseId, dto.academicTermId, section);

    try {
      const offering =
        await this.database.client.orm.public.CourseOffering.create({
          courseId,
          academicTermId: dto.academicTermId,
          instructorId: dto.instructorId,
          section,
          capacity: dto.capacity ?? null,
        });
      return this.getById(offering.id);
    } catch (error) {
      this.handleDatabaseError(error, 'create');
    }
  }

  async update(id: string, dto: UpdateCourseOfferingDto) {
    const existing = await this.database.client.orm.public.CourseOffering.where(
      {
        id,
      },
    )
      .all()
      .first();

    if (existing === null) {
      throw new NotFoundException('Course offering not found');
    }

    const academicTermId = dto.academicTermId ?? existing.academicTermId;
    const instructorId = dto.instructorId ?? existing.instructorId;
    const section = dto.section === undefined ? undefined : dto.section.trim();

    if (section !== undefined && !section) {
      throw new BadRequestException('Course offering section cannot be empty');
    }
    this.validateCapacity(dto.capacity);

    if (dto.academicTermId !== undefined) {
      await this.ensureTermExists(academicTermId);
    }
    if (dto.instructorId !== undefined) {
      await this.ensureInstructorExists(instructorId);
    }

    if (
      academicTermId !== existing.academicTermId ||
      instructorId !== existing.instructorId
    ) {
      await this.meetingsService.assertOfferingScheduleAvailable(
        id,
        instructorId,
        academicTermId,
      );
    }

    await this.ensureUniqueSection(
      existing.courseId,
      academicTermId,
      section ?? existing.section,
      id,
    );

    const update: {
      academicTermId?: string;
      instructorId?: string;
      section?: string;
      capacity?: number | null;
    } = {};
    if (dto.academicTermId !== undefined)
      update.academicTermId = academicTermId;
    if (dto.instructorId !== undefined) update.instructorId = instructorId;
    if (section !== undefined) update.section = section;
    if (dto.capacity !== undefined) update.capacity = dto.capacity;

    if (Object.keys(update).length === 0) return this.getById(id);

    try {
      const updated =
        await this.database.client.orm.public.CourseOffering.where({
          id,
        }).update(update);
      if (updated === null) {
        throw new NotFoundException('Course offering not found');
      }
      return this.getById(id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleDatabaseError(error, 'update');
    }
  }

  async remove(id: string) {
    const offering = await this.database.client.orm.public.CourseOffering.where(
      {
        id,
      },
    )
      .select('id')
      .all()
      .first();

    if (offering === null) {
      throw new NotFoundException('Course offering not found');
    }

    const dependencies = await Promise.all([
      this.database.client.orm.public.Enrollment.where({ offeringId: id })
        .select('id')
        .all()
        .first(),
      this.database.client.orm.public.Assignment.where({ offeringId: id })
        .select('id')
        .all()
        .first(),
      this.database.client.orm.public.Exam.where({ offeringId: id })
        .select('id')
        .all()
        .first(),
      this.database.client.orm.public.Attendance.where({ offeringId: id })
        .select('id')
        .all()
        .first(),
      this.database.client.orm.public.CourseMeeting.where({ offeringId: id })
        .select('id')
        .all()
        .first(),
    ]);

    if (dependencies.some((dependency) => dependency !== null)) {
      throw new ConflictException(
        'Cannot delete a CourseOffering with enrollments, assignments, exams, attendance, or meetings',
      );
    }

    try {
      const removed =
        await this.database.client.orm.public.CourseOffering.where({
          id,
        }).delete();
      if (removed === null) {
        throw new NotFoundException('Course offering not found');
      }
      return {
        id: removed.id,
        courseId: removed.courseId,
        academicTermId: removed.academicTermId,
        section: removed.section,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleDatabaseError(error, 'delete');
    }
  }

  private async ensureCourseExists(courseId: string): Promise<void> {
    const course = await this.database.client.orm.public.Course.where({
      id: courseId,
    })
      .select('id')
      .all()
      .first();
    if (course === null) throw new NotFoundException('Course not found');
  }

  private async ensureTermExists(academicTermId: string): Promise<void> {
    const term = await this.database.client.orm.public.AcademicTerm.where({
      id: academicTermId,
    })
      .select('id')
      .all()
      .first();
    if (term === null) throw new NotFoundException('Academic term not found');
  }

  private async ensureInstructorExists(instructorId: string): Promise<void> {
    const instructor = await this.database.client.orm.public.Instructor.where({
      id: instructorId,
    })
      .select('id')
      .all()
      .first();
    if (instructor === null)
      throw new NotFoundException('Instructor not found');
  }

  private validateCapacity(capacity?: number | null): void {
    if (capacity != null && (!Number.isInteger(capacity) || capacity < 1)) {
      throw new BadRequestException('capacity must be a positive integer');
    }
  }

  private async ensureUniqueSection(
    courseId: string,
    academicTermId: string,
    section: string,
    excludeOfferingId?: string,
  ): Promise<void> {
    const existing = await this.database.client.orm.public.CourseOffering.where(
      {
        courseId,
        academicTermId,
        section,
      },
    )
      .select('id')
      .all()
      .first();

    if (existing !== null && existing.id !== excludeOfferingId) {
      throw new ConflictException(
        'Course offering already exists for this Course, AcademicTerm, and section',
      );
    }
  }

  private handleDatabaseError(error: unknown, operation: string): never {
    const databaseError = error as { code?: string };
    if (databaseError?.code === 'P2002') {
      throw new ConflictException(
        'Course offering already exists for this Course, AcademicTerm, and section',
      );
    }
    if (databaseError?.code === 'P2003') {
      if (operation === 'delete') {
        throw new ConflictException(
          'Cannot delete a CourseOffering with dependent records',
        );
      }
      throw new BadRequestException(
        'Course offering references a record that does not exist',
      );
    }
    throw new InternalServerErrorException(
      `Unable to ${operation} CourseOffering`,
    );
  }
}
