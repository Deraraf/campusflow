import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateAttendanceDto } from './dto/create-attendance.dto.js';
import { UpdateAttendanceDto } from './dto/update-attendance.dto.js';

const VALID_ATTENDANCE_STATUSES = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'EXCUSED',
] as const;

type AttendanceStatusValue = (typeof VALID_ATTENDANCE_STATUSES)[number];

@Injectable()
export class AttendanceService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: UserResponse) {
    if (user.role === 'ADMIN') {
      return this.queryAttendanceRecords();
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      const rows = await this.queryAttendanceRecords();
      return rows
        .filter((row) => row.offering?.instructorId === instructor.id)
        .map((row) => this.serializeAttendance(row, user.role));
    }

    const student = await this.resolveStudent(user.id);
    const rows = await this.queryAttendanceRecords({ studentId: student.id });
    return rows.map((row) => this.serializeAttendance(row, user.role));
  }

  async getById(id: string, user: UserResponse) {
    const record = await this.getAttendanceRecord(id);

    if (user.role === 'ADMIN') {
      return this.serializeAttendance(record, user.role);
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      if (record.offering?.instructorId !== instructor.id) {
        throw new ForbiddenException(
          'You do not manage this attendance record',
        );
      }
      return this.serializeAttendance(record, user.role);
    }

    const student = await this.resolveStudent(user.id);
    if (record.studentId !== student.id) {
      throw new ForbiddenException(
        'You cannot view another student attendance record',
      );
    }

    return this.serializeAttendance(record, user.role);
  }

  async listForOffering(offeringId: string, user: UserResponse) {
    const offering = await this.database.client.orm.public.CourseOffering.where(
      { id: offeringId },
    )
      .select('id', 'instructorId')
      .all()
      .first();

    if (offering === null) {
      throw new NotFoundException('Course offering not found');
    }

    if (user.role === 'ADMIN') {
      const rows = await this.queryAttendanceRecords({ offeringId });
      return rows.map((row) => this.serializeAttendance(row, user.role));
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      if (offering.instructorId !== instructor.id) {
        throw new ForbiddenException('You do not manage this course offering');
      }
      const rows = await this.queryAttendanceRecords({ offeringId });
      return rows.map((row) => this.serializeAttendance(row, user.role));
    }

    const student = await this.resolveStudent(user.id);
    const enrollment = await this.database.client.orm.public.Enrollment.where({
      studentId: student.id,
      offeringId,
      status: 'ACTIVE',
    })
      .select('id')
      .all()
      .first();

    if (enrollment === null) {
      throw new ForbiddenException(
        'Student is not actively enrolled in this course offering',
      );
    }

    const rows = await this.queryAttendanceRecords({
      offeringId,
      studentId: student.id,
    });
    return rows.map((row) => this.serializeAttendance(row, user.role));
  }

  async create(
    offeringId: string,
    dto: CreateAttendanceDto,
    user: UserResponse,
  ) {
    if (user.role !== 'INSTRUCTOR') {
      throw new ForbiddenException('Only instructors can record attendance');
    }

    const instructor = await this.resolveInstructor(user.id);
    const offering = await this.database.client.orm.public.CourseOffering.where(
      { id: offeringId },
    )
      .select('id', 'instructorId')
      .all()
      .first();

    if (offering === null) {
      throw new NotFoundException('Course offering not found');
    }

    if (offering.instructorId !== instructor.id) {
      throw new ForbiddenException(
        'Instructor is not assigned to this course offering',
      );
    }

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
      throw new ConflictException(
        'Student must be ACTIVE to receive attendance records',
      );
    }

    const enrollment = await this.database.client.orm.public.Enrollment.where({
      studentId: student.id,
      offeringId,
      status: 'ACTIVE',
    })
      .select('id')
      .all()
      .first();

    if (enrollment === null) {
      throw new ConflictException(
        'Student must have an ACTIVE enrollment in this offering',
      );
    }

    const normalizedDate = this.normalizeDate(dto.date);
    this.validateStatus(dto.status);

    const duplicate = await this.database.client.orm.public.Attendance.where({
      studentId: student.id,
      offeringId,
      date: normalizedDate,
    })
      .select('id')
      .all()
      .first();

    if (duplicate !== null) {
      throw new ConflictException(
        'Attendance already exists for this student and date',
      );
    }

    try {
      const created = await this.database.client.orm.public.Attendance.create({
        studentId: student.id,
        offeringId,
        date: normalizedDate,
        status: dto.status,
      });
      return this.getById(created.id, user);
    } catch (error) {
      throw this.normalizeDatabaseError(error, 'create attendance');
    }
  }

  async update(id: string, dto: UpdateAttendanceDto, user: UserResponse) {
    const record = await this.getAttendanceRecord(id);

    if (user.role === 'STUDENT') {
      throw new ForbiddenException('Students cannot update attendance records');
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      if (record.offering?.instructorId !== instructor.id) {
        throw new ForbiddenException(
          'You do not manage this attendance record',
        );
      }
    }

    const updates: Record<string, unknown> = {};

    if (dto.date !== undefined) {
      const normalizedDate = this.normalizeDate(dto.date);
      const duplicate = await this.database.client.orm.public.Attendance.where({
        studentId: record.studentId,
        offeringId: record.offeringId,
        date: normalizedDate,
      })
        .select('id')
        .all()
        .first();

      if (duplicate !== null && duplicate.id !== id) {
        throw new ConflictException(
          'Attendance already exists for this student and date',
        );
      }
      updates.date = normalizedDate;
    }

    if (dto.status !== undefined) {
      updates.status = this.validateStatus(dto.status);
    }

    if (Object.keys(updates).length === 0) {
      return this.serializeAttendance(record, user.role);
    }

    const updated = await this.database.client.orm.public.Attendance.where({
      id,
    }).update(updates);
    if (updated === null) {
      throw new NotFoundException('Attendance not found');
    }

    return this.getById(id, user);
  }

  async getMyAttendance(user: UserResponse) {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException(
        'Only students can view their own attendance',
      );
    }

    const student = await this.resolveStudent(user.id);
    const rows = await this.queryAttendanceRecords({ studentId: student.id });
    return rows.map((row) => this.serializeAttendance(row, user.role));
  }

  async getStudentAttendance(studentId: string, user: UserResponse) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only admins can view a student attendance ledger',
      );
    }

    const student = await this.database.client.orm.public.Student.where({
      id: studentId,
    })
      .select('id')
      .all()
      .first();

    if (student === null) {
      throw new NotFoundException('Student not found');
    }

    const rows = await this.queryAttendanceRecords({ studentId });
    return rows.map((row) => this.serializeAttendance(row, user.role));
  }

  private async getAttendanceRecord(id: string) {
    const record = await this.database.client.orm.public.Attendance.where({
      id,
    })
      .select(
        'id',
        'studentId',
        'offeringId',
        'date',
        'status',
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
          .select('id', 'instructorId', 'section')
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
          ),
      )
      .all()
      .first();

    if (record === null) {
      throw new NotFoundException('Attendance record not found');
    }

    return record;
  }

  private async queryAttendanceRecords(filters: Record<string, string> = {}) {
    const query = Object.keys(filters).length
      ? this.database.client.orm.public.Attendance.where(filters)
      : this.database.client.orm.public.Attendance.where({});

    return query
      .select(
        'id',
        'studentId',
        'offeringId',
        'date',
        'status',
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
          .select('id', 'instructorId', 'section')
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
          ),
      )
      .all();
  }

  private async resolveInstructor(userId: string) {
    const instructor = await this.database.client.orm.public.Instructor.where({
      userId,
    })
      .select('id', 'userId')
      .all()
      .first();

    if (instructor === null) {
      throw new ForbiddenException(
        'No Instructor record exists for this account',
      );
    }

    return instructor;
  }

  private async resolveStudent(userId: string) {
    const student = await this.database.client.orm.public.Student.where({
      userId,
    })
      .select('id', 'userId', 'status')
      .all()
      .first();

    if (student === null) {
      throw new ForbiddenException('No Student record exists for this account');
    }

    return student;
  }

  private normalizeDate(value: string) {
    const raw = value.trim();
    const candidate = new Date(raw);

    if (Number.isNaN(candidate.getTime())) {
      throw new BadRequestException('Attendance date must be a valid date');
    }

    const normalized = new Date(
      Date.UTC(
        candidate.getUTCFullYear(),
        candidate.getUTCMonth(),
        candidate.getUTCDate(),
      ),
    );

    return normalized.toISOString();
  }

  private validateStatus(value: string): AttendanceStatusValue {
    if (!VALID_ATTENDANCE_STATUSES.includes(value as AttendanceStatusValue)) {
      throw new BadRequestException(
        'Attendance status must be one of PRESENT, ABSENT, LATE, or EXCUSED',
      );
    }

    return value as AttendanceStatusValue;
  }

  private serializeAttendance(
    record: Record<string, any>,
    role: UserResponse['role'],
  ) {
    const course = record.offering?.course
      ? {
          id: record.offering.course.id,
          code: record.offering.course.code,
          title: record.offering.course.title,
        }
      : null;

    const offering = record.offering
      ? {
          id: record.offering.id,
          section: record.offering.section,
        }
      : null;

    const academicTerm = record.offering?.academicTerm
      ? {
          id: record.offering.academicTerm.id,
          semester: record.offering.academicTerm.semester,
          academicYear: record.offering.academicTerm.academicYear
            ? {
                id: record.offering.academicTerm.academicYear.id,
                name: record.offering.academicTerm.academicYear.name,
              }
            : null,
        }
      : null;

    const base = {
      id: record.id,
      studentId: record.studentId,
      offeringId: record.offeringId,
      date: record.date,
      status: record.status,
      course,
      offering,
      academicTerm,
    };

    if (role === 'STUDENT') {
      return base;
    }

    return {
      ...base,
      student: record.student
        ? {
            id: record.student.id,
            studentNumber: record.student.studentNumber,
            firstName: record.student.user?.firstName ?? null,
            lastName: record.student.user?.lastName ?? null,
          }
        : null,
    };
  }

  private normalizeDatabaseError(error: unknown, action: string) {
    if (error instanceof BadRequestException) throw error;
    if (error instanceof NotFoundException) throw error;
    if (error instanceof ConflictException) throw error;
    if (error instanceof ForbiddenException) throw error;
    throw new BadRequestException(`Unable to ${action}`);
  }
}
