import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateExamDto } from './dto/create-exam.dto.js';
import { UpdateExamDto } from './dto/update-exam.dto.js';

@Injectable()
export class ExamsService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: UserResponse) {
    const records = await this.queryExams();
    return this.filterByRole(records, user);
  }

  async listForOffering(offeringId: string, user: UserResponse) {
    const offering = await this.database.client.orm.public.CourseOffering.where(
      {
        id: offeringId,
      },
    )
      .select('id', 'instructorId')
      .all()
      .first();

    if (offering === null) {
      throw new NotFoundException('Course offering not found.');
    }

    if (user.role === 'ADMIN') {
      return this.queryExams({ offeringId }).then((records) =>
        Promise.all(
          records.map((record) => this.serializeExam(record, user.role)),
        ),
      );
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      if (offering.instructorId !== instructor.id) {
        throw new ForbiddenException(
          'You can only view exams for the offerings you teach.',
        );
      }
      return this.queryExams({ offeringId }).then((records) =>
        Promise.all(
          records.map((record) => this.serializeExam(record, user.role)),
        ),
      );
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
        'Student is not actively enrolled in this course offering.',
      );
    }

    return this.queryExams({ offeringId }).then((records) =>
      Promise.all(
        records.map((record) => this.serializeExam(record, user.role)),
      ),
    );
  }

  async getById(id: string, user: UserResponse) {
    const record = await this.getExamRecord(id);
    const visible = await this.filterByRole([record], user);

    if (visible.length === 0) {
      throw new ForbiddenException('You do not have access to this exam.');
    }

    return visible[0];
  }

  async getMyExams(user: UserResponse) {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Only students can access their own exams.');
    }

    const student = await this.resolveStudent(user.id);
    const records = await this.queryExams();
    const visible = [] as any[];

    for (const record of records) {
      const enrollment = await this.database.client.orm.public.Enrollment.where(
        {
          studentId: student.id,
          offeringId: record.offeringId,
          status: 'ACTIVE',
        },
      )
        .select('id')
        .all()
        .first();

      if (enrollment !== null) {
        visible.push(record);
      }
    }

    return Promise.all(
      visible.map(async (record) => this.serializeExam(record, user.role)),
    );
  }

  async create(offeringId: string, dto: CreateExamDto, user: UserResponse) {
    if (user.role !== 'INSTRUCTOR') {
      throw new ForbiddenException('Only instructors can create exams.');
    }

    const instructor = await this.resolveInstructor(user.id);
    const offering = await this.database.client.orm.public.CourseOffering.where(
      {
        id: offeringId,
      },
    )
      .select('id', 'instructorId', 'academicTermId')
      .all()
      .first();

    if (offering === null) {
      throw new NotFoundException('Course offering not found.');
    }

    if (offering.instructorId !== instructor.id) {
      throw new ForbiddenException(
        'You can only create exams for the offerings you teach.',
      );
    }

    const title = dto.title.trim();
    if (!title) {
      throw new BadRequestException('Exam title is required.');
    }

    const examDate = this.normalizeDate(dto.examDate);
    const academicTerm =
      await this.database.client.orm.public.AcademicTerm.where({
        id: offering.academicTermId,
      })
        .select('id', 'semester', 'startDate', 'endDate')
        .all()
        .first();

    if (academicTerm === null) {
      throw new NotFoundException(
        'Academic term for this offering was not found.',
      );
    }

    const termStart = this.normalizeDate(academicTerm.startDate);
    const termEnd = this.normalizeDate(academicTerm.endDate);

    if (examDate < termStart || examDate > termEnd) {
      throw new BadRequestException(
        'Exam date must fall within the academic term for the offering.',
      );
    }

    const created = await this.database.client.orm.public.Exam.create({
      offeringId,
      instructorId: instructor.id,
      title,
      examDate,
      maxScore: dto.maxScore,
    });

    return this.getById(created.id, user);
  }

  async update(id: string, dto: UpdateExamDto, user: UserResponse) {
    const record = await this.getExamRecord(id);

    if (user.role === 'STUDENT') {
      throw new ForbiddenException('Students cannot update exams.');
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      const offering =
        await this.database.client.orm.public.CourseOffering.where({
          id: record.offeringId,
        })
          .select('id', 'instructorId', 'academicTermId')
          .all()
          .first();

      if (offering === null || offering.instructorId !== instructor.id) {
        throw new ForbiddenException(
          'You can only update exams for the offerings you teach.',
        );
      }
    }

    const updates: Record<string, unknown> = {};

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) {
        throw new BadRequestException('Exam title cannot be blank.');
      }
      updates.title = title;
    }

    if (dto.examDate !== undefined) {
      const examDate = this.normalizeDate(dto.examDate);
      const offering =
        await this.database.client.orm.public.CourseOffering.where({
          id: record.offeringId,
        })
          .select('id', 'academicTermId')
          .all()
          .first();

      if (offering === null) {
        throw new NotFoundException(
          'Course offering for this exam was not found.',
        );
      }

      const academicTerm =
        await this.database.client.orm.public.AcademicTerm.where({
          id: offering.academicTermId,
        })
          .select('id', 'semester', 'startDate', 'endDate')
          .all()
          .first();

      if (academicTerm === null) {
        throw new NotFoundException(
          'Academic term for this exam was not found.',
        );
      }

      const termStart = this.normalizeDate(academicTerm.startDate);
      const termEnd = this.normalizeDate(academicTerm.endDate);

      if (examDate < termStart || examDate > termEnd) {
        throw new BadRequestException(
          'Exam date must remain within the academic term.',
        );
      }
      updates.examDate = examDate;
    }

    if (dto.maxScore !== undefined) {
      if (dto.maxScore <= 0) {
        throw new BadRequestException(
          'Maximum score must be greater than zero.',
        );
      }
      updates.maxScore = dto.maxScore;
    }

    if (Object.keys(updates).length === 0) {
      return this.serializeExam(record, user.role);
    }

    const updated = await this.database.client.orm.public.Exam.where({
      id,
    }).update(updates);

    if (updated === null) {
      throw new NotFoundException('Exam not found.');
    }

    return this.getById(updated.id, user);
  }

  async remove(id: string, user: UserResponse) {
    if (user.role !== 'INSTRUCTOR') {
      throw new ForbiddenException('Only instructors can delete exams.');
    }

    const record = await this.getExamRecord(id);
    const instructor = await this.resolveInstructor(user.id);
    const offering = await this.database.client.orm.public.CourseOffering.where(
      {
        id: record.offeringId,
      },
    )
      .select('id', 'instructorId')
      .all()
      .first();

    if (offering === null || offering.instructorId !== instructor.id) {
      throw new ForbiddenException(
        'You can only delete exams for the offerings you teach.',
      );
    }

    await this.database.client.orm.public.Exam.where({ id }).delete();
    return { deleted: true, id };
  }

  private async queryExams(criteria?: { offeringId?: string }) {
    const where = criteria?.offeringId
      ? { offeringId: criteria.offeringId }
      : {};
    return this.database.client.orm.public.Exam.where(where)
      .select('id', 'offeringId', 'title', 'examDate', 'maxScore')
      .all();
  }

  private async getExamRecord(id: string) {
    const exam = await this.database.client.orm.public.Exam.where({ id })
      .select('id', 'offeringId', 'title', 'examDate', 'maxScore')
      .all()
      .first();

    if (exam === null) {
      throw new NotFoundException('Exam not found.');
    }

    return exam;
  }

  private async filterByRole(records: any[], user: UserResponse) {
    if (user.role === 'ADMIN') {
      return Promise.all(
        records.map(async (record) => this.serializeExam(record, user.role)),
      );
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      const visible = [] as any[];

      for (const record of records) {
        const offering =
          await this.database.client.orm.public.CourseOffering.where({
            id: record.offeringId,
          })
            .select('id', 'instructorId')
            .all()
            .first();

        if (offering && offering.instructorId === instructor.id) {
          visible.push(record);
        }
      }

      return Promise.all(
        visible.map(async (record) => this.serializeExam(record, user.role)),
      );
    }

    if (user.role === 'STUDENT') {
      const student = await this.resolveStudent(user.id);
      const visible = [] as any[];

      for (const record of records) {
        const enrollment =
          await this.database.client.orm.public.Enrollment.where({
            studentId: student.id,
            offeringId: record.offeringId,
            status: 'ACTIVE',
          })
            .select('id')
            .all()
            .first();

        if (enrollment !== null) {
          visible.push(record);
        }
      }

      return Promise.all(
        visible.map(async (record) => this.serializeExam(record, user.role)),
      );
    }

    throw new ForbiddenException('Unsupported role.');
  }

  private async serializeExam(record: any, role: string) {
    const offering = await this.database.client.orm.public.CourseOffering.where(
      {
        id: record.offeringId,
      },
    )
      .select('id', 'courseId', 'academicTermId', 'instructorId', 'section')
      .all()
      .first();

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
      offeringId: record.offeringId,
      title: record.title,
      examDate: record.examDate
        ? new Date(record.examDate).toISOString()
        : null,
      maxScore: record.maxScore,
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
        ? {
            id: offering.id,
            section: offering.section,
          }
        : null,
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

  private normalizeDate(value: string | Date): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date value.');
    }
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    ).toISOString();
  }
}
