import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateGradeDto } from './dto/create-grade.dto.js';
import { UpdateGradeDto } from './dto/update-grade.dto.js';

@Injectable()
export class GradesService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: UserResponse) {
    const grades = await this.queryGrades();
    return this.filterByRole(grades, user);
  }

  async getById(id: string, user: UserResponse) {
    const grade = await this.getGradeRecord(id);
    const visible = await this.filterByRole([grade], user);

    if (visible.length === 0) {
      throw new ForbiddenException('You do not have access to this grade.');
    }

    return visible[0];
  }

  async getMyGrades(user: UserResponse) {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException(
        'Only students can access their own grades.',
      );
    }

    const student = await this.resolveStudent(user.id);
    const grades = await this.queryGrades();
    const visible = grades.filter((grade) => grade.studentId === student.id);
    return Promise.all(
      visible.map(async (grade) => this.serializeGrade(grade, user.role)),
    );
  }

  async getStudentGrades(studentId: string, user: UserResponse) {
    if (user.role !== 'ADMIN') {
      throw new ForbiddenException(
        "Only admins can view another student's grades.",
      );
    }

    const student = await this.database.client.orm.public.Student.where({
      id: studentId,
    })
      .select('id')
      .all()
      .first();

    if (student === null) {
      throw new NotFoundException('Student not found.');
    }

    const grades = await this.queryGrades();
    const filtered = grades.filter((grade) => grade.studentId === studentId);

    return Promise.all(
      filtered.map(async (grade) => this.serializeGrade(grade, user.role)),
    );
  }

  async create(enrollmentId: string, dto: CreateGradeDto, user: UserResponse) {
    if (user.role !== 'INSTRUCTOR') {
      throw new ForbiddenException('Only instructors can create final grades.');
    }

    const enrollment = await this.database.client.orm.public.Enrollment.where({
      id: enrollmentId,
    })
      .select('id', 'studentId', 'offeringId', 'status')
      .all()
      .first();

    if (enrollment === null) {
      throw new NotFoundException('Enrollment not found.');
    }

    const instructor = await this.resolveInstructor(user.id);
    const offering = await this.database.client.orm.public.CourseOffering.where(
      {
        id: enrollment.offeringId,
      },
    )
      .select('id', 'instructorId')
      .all()
      .first();

    if (offering === null) {
      throw new NotFoundException(
        'Offering for this enrollment was not found.',
      );
    }

    if (offering.instructorId !== instructor.id) {
      throw new ForbiddenException(
        'You can only add grades for the offerings you teach.',
      );
    }

    if (enrollment.status === 'DROPPED') {
      throw new ConflictException(
        'Dropped enrollments cannot receive final grades.',
      );
    }

    const existing = await this.database.client.orm.public.Grade.where({
      enrollmentId,
    })
      .select('id')
      .all()
      .first();

    if (existing !== null) {
      throw new ConflictException(
        'A final grade already exists for this enrollment.',
      );
    }

    const payload: Record<string, unknown> = {
      enrollmentId,
      studentId: enrollment.studentId,
    };

    if (dto.score !== undefined) {
      if (!Number.isFinite(dto.score) || dto.score < 0) {
        throw new BadRequestException(
          'Score must be a valid non-negative number.',
        );
      }
      payload.score = dto.score;
    }

    if (dto.letterGrade !== undefined) {
      const letterGrade = dto.letterGrade.trim();
      if (!letterGrade) {
        throw new BadRequestException('Letter grade cannot be blank.');
      }
      payload.letterGrade = letterGrade;
    }

    if (Object.keys(payload).length === 2) {
      throw new BadRequestException('A grade value is required.');
    }

    const created = await this.database.client.orm.public.Grade.create({
      ...payload,
    });

    return this.getById(created.id, user);
  }

  async update(id: string, dto: UpdateGradeDto, user: UserResponse) {
    if (user.role !== 'INSTRUCTOR' && user.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only instructors or admins can update final grades.',
      );
    }

    const grade = await this.getGradeRecord(id);

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      const enrollment = await this.database.client.orm.public.Enrollment.where(
        {
          id: grade.enrollmentId,
        },
      )
        .select('id', 'offeringId')
        .all()
        .first();

      if (enrollment === null) {
        throw new NotFoundException('Enrollment for this grade was not found.');
      }

      const offering =
        await this.database.client.orm.public.CourseOffering.where({
          id: enrollment.offeringId,
        })
          .select('id', 'instructorId')
          .all()
          .first();

      if (offering === null || offering.instructorId !== instructor.id) {
        throw new ForbiddenException(
          'You can only update grades for the offerings you teach.',
        );
      }
    }

    const updates: Record<string, unknown> = {};

    if (dto.score !== undefined) {
      if (!Number.isFinite(dto.score) || dto.score < 0) {
        throw new BadRequestException(
          'Score must be a valid non-negative number.',
        );
      }
      updates.score = dto.score;
    }

    if (dto.letterGrade !== undefined) {
      const letterGrade = dto.letterGrade.trim();
      if (!letterGrade) {
        throw new BadRequestException('Letter grade cannot be blank.');
      }
      updates.letterGrade = letterGrade;
    }

    if (Object.keys(updates).length === 0) {
      return this.serializeGrade(grade, user.role);
    }

    const updated = await this.database.client.orm.public.Grade.where({
      id,
    }).update(updates);

    if (updated === null) {
      throw new NotFoundException('Grade not found.');
    }

    return this.getById(updated.id, user);
  }

  private async queryGrades() {
    return this.database.client.orm.public.Grade.where({})
      .select('id', 'enrollmentId', 'studentId', 'score', 'letterGrade')
      .all();
  }

  private async getGradeRecord(id: string) {
    const grade = await this.database.client.orm.public.Grade.where({ id })
      .select('id', 'enrollmentId', 'studentId', 'score', 'letterGrade')
      .all()
      .first();

    if (grade === null) {
      throw new NotFoundException('Grade not found.');
    }

    return grade;
  }

  private async filterByRole(grades: any[], user: UserResponse) {
    if (user.role === 'ADMIN') {
      return Promise.all(
        grades.map(async (grade) => this.serializeGrade(grade, user.role)),
      );
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      const visible = [] as any[];

      for (const grade of grades) {
        const enrollment =
          await this.database.client.orm.public.Enrollment.where({
            id: grade.enrollmentId,
          })
            .select('id', 'offeringId')
            .all()
            .first();

        if (enrollment !== null) {
          const offering =
            await this.database.client.orm.public.CourseOffering.where({
              id: enrollment.offeringId,
            })
              .select('id', 'instructorId')
              .all()
              .first();

          if (offering && offering.instructorId === instructor.id) {
            visible.push(grade);
          }
        }
      }

      return Promise.all(
        visible.map(async (grade) => this.serializeGrade(grade, user.role)),
      );
    }

    if (user.role === 'STUDENT') {
      const student = await this.resolveStudent(user.id);
      const visible = grades.filter((grade) => grade.studentId === student.id);
      return Promise.all(
        visible.map(async (grade) => this.serializeGrade(grade, user.role)),
      );
    }

    throw new ForbiddenException('Unsupported role.');
  }

  private async serializeGrade(record: any, role: string) {
    const enrollment = await this.database.client.orm.public.Enrollment.where({
      id: record.enrollmentId,
    })
      .select('id', 'studentId', 'offeringId')
      .all()
      .first();

    const student = enrollment
      ? await this.database.client.orm.public.Student.where({
          id: enrollment.studentId,
        })
          .select('id', 'userId')
          .all()
          .first()
      : null;

    const offering = enrollment
      ? await this.database.client.orm.public.CourseOffering.where({
          id: enrollment.offeringId,
        })
          .select('id', 'courseId', 'academicTermId', 'instructorId')
          .all()
          .first()
      : null;

    const course = offering
      ? await this.database.client.orm.public.Course.where({
          id: offering.courseId,
        })
          .select('id', 'code', 'title')
          .all()
          .first()
      : null;

    const academicTerm = offering
      ? await this.database.client.orm.public.AcademicTerm.where({
          id: offering.academicTermId,
        })
          .select('id', 'semester', 'startDate', 'endDate')
          .all()
          .first()
      : null;

    const instructor = offering
      ? await this.database.client.orm.public.Instructor.where({
          id: offering.instructorId,
        })
          .select('id', 'userId')
          .all()
          .first()
      : null;

    const instructorUser = instructor
      ? await this.database.client.orm.public.User.where({
          id: instructor.userId,
        })
          .select('id', 'firstName', 'lastName')
          .all()
          .first()
      : null;

    const base = {
      id: record.id,
      enrollmentId: record.enrollmentId,
      studentId: record.studentId,
      score: record.score ?? null,
      letterGrade: record.letterGrade ?? null,
      course: course
        ? { id: course.id, code: course.code, title: course.title }
        : null,
      academicTerm: academicTerm
        ? {
            id: academicTerm.id,
            semester: academicTerm.semester,
            startDate: academicTerm.startDate
              ? new Date(academicTerm.startDate).toISOString()
              : null,
            endDate: academicTerm.endDate
              ? new Date(academicTerm.endDate).toISOString()
              : null,
          }
        : null,
      offering: offering
        ? { id: offering.id, courseId: offering.courseId }
        : null,
      student: student ? { id: student.id, userId: student.userId } : null,
    };

    if (role === 'ADMIN' || role === 'INSTRUCTOR') {
      return {
        ...base,
        instructor: instructor
          ? {
              id: instructor.id,
              userId: instructor.userId,
              firstName: instructorUser?.firstName ?? null,
              lastName: instructorUser?.lastName ?? null,
            }
          : null,
      };
    }

    return base;
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
        'Instructor record not found for this account.',
      );
    }

    return instructor;
  }

  private async resolveStudent(userId: string) {
    const student = await this.database.client.orm.public.Student.where({
      userId,
    })
      .select('id', 'userId')
      .all()
      .first();

    if (student === null) {
      throw new ForbiddenException(
        'Student record not found for this account.',
      );
    }

    return student;
  }
}
