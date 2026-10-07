import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateEnrollmentDto } from './dto/create-enrollment.dto.js';
import { UpdateEnrollmentStatusDto } from './dto/update-enrollment-status.dto.js';

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  ACTIVE: ['DROPPED', 'COMPLETED', 'FAILED'],
  DROPPED: ['ACTIVE'],
  COMPLETED: [],
  FAILED: [],
};

type EnrollmentStatus = 'ACTIVE' | 'DROPPED' | 'COMPLETED' | 'FAILED';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly database: DatabaseService) {}

  async list(filters?: {
    studentId?: string;
    offeringId?: string;
    status?: string;
  }): Promise<unknown[]> {
    const criteria = Object.fromEntries(
      Object.entries(filters ?? {}).filter(([, value]) => value !== undefined),
    );

    const baseQuery = Object.keys(criteria).length
      ? this.database.client.orm.public.Enrollment.where(criteria)
      : this.database.client.orm.public.Enrollment;

    const rows = await baseQuery
      .select(
        'id',
        'studentId',
        'offeringId',
        'status',
        'enrolledAt',
        'createdAt',
        'updatedAt',
      )
      .include('student', (student) =>
        student
          .select('id', 'studentNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('offering', (offering) =>
        offering
          .select('id', 'section', 'capacity')
          .include('course', (course) => course.select('id', 'code', 'title'))
          .include('instructor', (instructor) =>
            instructor
              .select('id', 'employeeNumber')
              .include('user', (user) =>
                user.select('id', 'firstName', 'lastName'),
              ),
          )
          .include('academicTerm', (term) =>
            term
              .select('id', 'semester', 'academicYearId')
              .include('academicYear', (year) => year.select('id', 'name')),
          ),
      )
      .all();

    return Promise.all(rows.map((row) => this.serializeEnrollment(row)));
  }

  async getById(id: string): Promise<unknown> {
    const enrollment = await this.database.client.orm.public.Enrollment.where({
      id,
    })
      .select(
        'id',
        'studentId',
        'offeringId',
        'status',
        'enrolledAt',
        'createdAt',
        'updatedAt',
      )
      .include('student', (student) =>
        student
          .select('id', 'studentNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('offering', (offering) =>
        offering
          .select('id', 'section', 'capacity')
          .include('course', (course) => course.select('id', 'code', 'title'))
          .include('instructor', (instructor) =>
            instructor
              .select('id', 'employeeNumber')
              .include('user', (user) =>
                user.select('id', 'firstName', 'lastName'),
              ),
          )
          .include('academicTerm', (term) =>
            term
              .select('id', 'semester', 'academicYearId')
              .include('academicYear', (year) => year.select('id', 'name')),
          ),
      )
      .all()
      .first();

    if (enrollment === null) {
      throw new NotFoundException('Enrollment not found');
    }

    return this.serializeEnrollment(enrollment);
  }

  async create(dto: CreateEnrollmentDto): Promise<unknown> {
    const student = await this.database.client.orm.public.Student.where({
      id: dto.studentId,
    })
      .select('id', 'status')
      .all()
      .first();

    if (student === null) {
      throw new NotFoundException('Student not found');
    }

    if (student.status !== 'ACTIVE') {
      throw new ConflictException('Student must be ACTIVE to enroll');
    }

    const offering = await this.database.client.orm.public.CourseOffering.where(
      {
        id: dto.offeringId,
      },
    )
      .select('id', 'courseId', 'academicTermId', 'capacity')
      .include('course', (course) => course.select('id', 'code', 'title'))
      .include('academicTerm', (term) =>
        term.select('id', 'semester', 'academicYearId'),
      )
      .all()
      .first();

    if (offering === null) {
      throw new NotFoundException('Course offering not found');
    }

    if (offering.course === null || offering.academicTerm === null) {
      throw new NotFoundException(
        'Course offering is missing required course or academic term data',
      );
    }

    const hasStanding =
      await this.database.client.orm.public.StudentAcademicStanding.where({
        studentId: dto.studentId,
        academicTermId: offering.academicTermId,
      })
        .select('id')
        .all()
        .first();

    if (hasStanding === null) {
      throw new ConflictException(
        'Student academic standing for the offering academic term is required before enrollment',
      );
    }

    const duplicate = await this.database.client.orm.public.Enrollment.where({
      studentId: dto.studentId,
      offeringId: dto.offeringId,
    })
      .select('id')
      .all()
      .first();

    if (duplicate !== null) {
      throw new ConflictException(
        'Student is already enrolled in this course offering',
      );
    }

    if (offering.capacity !== null) {
      const activeEnrollments =
        await this.database.client.orm.public.Enrollment.where({
          offeringId: dto.offeringId,
          status: 'ACTIVE',
        })
          .select('id')
          .all();

      if (activeEnrollments.length >= offering.capacity) {
        throw new ConflictException('Course offering has reached capacity');
      }
    }

    try {
      const created = await this.database.client.orm.public.Enrollment.create({
        studentId: dto.studentId,
        offeringId: dto.offeringId,
        status: 'ACTIVE',
      });

      return this.getById(created.id);
    } catch (error) {
      throw this.normalizeDatabaseError(error, 'create');
    }
  }

  async updateStatus(
    id: string,
    dto: UpdateEnrollmentStatusDto,
  ): Promise<unknown> {
    const enrollment = await this.database.client.orm.public.Enrollment.where({
      id,
    })
      .select('id', 'studentId', 'offeringId', 'status', 'enrolledAt')
      .all()
      .first();

    if (enrollment === null) {
      throw new NotFoundException('Enrollment not found');
    }

    const currentStatus = enrollment.status as EnrollmentStatus;
    const nextStatus = dto.status as EnrollmentStatus;
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus] ?? [];

    if (!allowed.includes(nextStatus)) {
      throw new ConflictException(
        `Invalid enrollment status transition from ${currentStatus} to ${nextStatus}`,
      );
    }

    if (nextStatus === 'ACTIVE') {
      const offering =
        await this.database.client.orm.public.CourseOffering.where({
          id: enrollment.offeringId,
        })
          .select('id', 'capacity')
          .all()
          .first();

      if (offering?.capacity !== null && offering?.capacity !== undefined) {
        const activeEnrollments =
          await this.database.client.orm.public.Enrollment.where({
            offeringId: enrollment.offeringId,
            status: 'ACTIVE',
          })
            .select('id')
            .all();

        const activeWithoutThisEnrollment = activeEnrollments.filter(
          (item) => item.id !== enrollment.id,
        );

        if (activeWithoutThisEnrollment.length >= offering.capacity) {
          throw new ConflictException('Course offering has reached capacity');
        }
      }
    }

    const updated = await this.database.client.orm.public.Enrollment.where({
      id,
      status: currentStatus,
    }).update({
      status: nextStatus,
    });

    if (updated === null) {
      throw new ConflictException(
        `Enrollment status has changed; unable to update from ${currentStatus}`,
      );
    }

    return this.getById(id);
  }

  async getMyEnrollments(userId: string): Promise<unknown[]> {
    const student = await this.database.client.orm.public.Student.where({
      userId,
    })
      .select('id')
      .all()
      .first();

    if (student === null) {
      throw new NotFoundException('No Student record exists for this account');
    }

    return this.getEnrollmentsForStudent(student.id);
  }

  async getStudentEnrollments(studentId: string): Promise<unknown[]> {
    const student = await this.database.client.orm.public.Student.where({
      id: studentId,
    })
      .select('id')
      .all()
      .first();

    if (student === null) {
      throw new NotFoundException('Student not found');
    }

    return this.getEnrollmentsForStudent(studentId);
  }

  private async getEnrollmentsForStudent(
    studentId: string,
  ): Promise<unknown[]> {
    const rows = await this.database.client.orm.public.Enrollment.where({
      studentId,
    })
      .select(
        'id',
        'studentId',
        'offeringId',
        'status',
        'enrolledAt',
        'createdAt',
        'updatedAt',
      )
      .include('student', (student) =>
        student
          .select('id', 'studentNumber')
          .include('user', (user) =>
            user.select('id', 'firstName', 'lastName'),
          ),
      )
      .include('offering', (offering) =>
        offering
          .select('id', 'section', 'capacity')
          .include('course', (course) => course.select('id', 'code', 'title'))
          .include('instructor', (instructor) =>
            instructor
              .select('id', 'employeeNumber')
              .include('user', (user) =>
                user.select('id', 'firstName', 'lastName'),
              ),
          )
          .include('academicTerm', (term) =>
            term
              .select('id', 'semester', 'academicYearId')
              .include('academicYear', (year) => year.select('id', 'name')),
          ),
      )
      .all();

    return Promise.all(rows.map((row) => this.serializeEnrollment(row)));
  }

  private async serializeEnrollment(enrollment: Record<string, any>) {
    const hydrated = { ...enrollment };

    if (hydrated.student == null) {
      hydrated.student = await this.database.client.orm.public.Student.where({
        id: hydrated.studentId,
      })
        .select('id', 'studentNumber')
        .include('user', (user) => user.select('id', 'firstName', 'lastName'))
        .all()
        .first();
    }

    if (hydrated.offering == null) {
      hydrated.offering =
        await this.database.client.orm.public.CourseOffering.where({
          id: hydrated.offeringId,
        })
          .select('id', 'section', 'capacity')
          .include('course', (course) => course.select('id', 'code', 'title'))
          .include('instructor', (instructor) =>
            instructor
              .select('id', 'employeeNumber')
              .include('user', (user) =>
                user.select('id', 'firstName', 'lastName'),
              ),
          )
          .include('academicTerm', (term) =>
            term
              .select('id', 'semester', 'academicYearId')
              .include('academicYear', (year) => year.select('id', 'name')),
          )
          .all()
          .first();
    }

    const student = hydrated.student ?? null;
    const offering = hydrated.offering ?? null;
    const term = offering?.academicTerm ?? null;
    const course = offering?.course ?? null;
    const instructor = offering?.instructor ?? null;

    return {
      id: hydrated.id,
      status: hydrated.status,
      enrolledAt: hydrated.enrolledAt,
      student:
        student === null
          ? null
          : {
              id: student.id,
              studentNumber: student.studentNumber,
              firstName: student.user?.firstName ?? null,
              lastName: student.user?.lastName ?? null,
            },
      offering:
        offering === null
          ? null
          : {
              id: offering.id,
              section: offering.section,
              capacity: offering.capacity,
            },
      course:
        course === null
          ? null
          : {
              id: course.id,
              code: course.code,
              title: course.title,
            },
      instructor:
        instructor === null
          ? null
          : {
              id: instructor.id,
              employeeNumber: instructor.employeeNumber,
              firstName: instructor.user?.firstName ?? null,
              lastName: instructor.user?.lastName ?? null,
            },
      academicTerm:
        term === null
          ? null
          : {
              id: term.id,
              semester: term.semester,
              academicYear: term.academicYear
                ? {
                    id: term.academicYear.id,
                    name: term.academicYear.name,
                  }
                : null,
            },
      createdAt: hydrated.createdAt,
      updatedAt: hydrated.updatedAt,
    };
  }

  private normalizeDatabaseError(error: unknown, action: string) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    if (error instanceof NotFoundException) {
      throw error;
    }

    if (error instanceof ConflictException) {
      throw error;
    }

    throw new BadRequestException(`Unable to ${action} enrollment`);
  }
}
