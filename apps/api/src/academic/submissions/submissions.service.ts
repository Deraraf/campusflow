import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateSubmissionDto } from './dto/create-submission.dto.js';
import { GradeSubmissionDto } from './dto/grade-submission.dto.js';
import { UpdateSubmissionDto } from './dto/update-submission.dto.js';

@Injectable()
export class SubmissionsService {
  constructor(private readonly database: DatabaseService) {}

  async getById(id: string, user: UserResponse) {
    const submission = await this.getSubmissionRecord(id);

    if (user.role === 'ADMIN') {
      return this.serializeSubmission(submission);
    }

    if (user.role === 'STUDENT') {
      const student = await this.resolveStudent(user.id);
      if (submission.studentId !== student.id) {
        throw new ForbiddenException('You cannot view another student submission');
      }
      return this.serializeSubmission(submission);
    }

    const instructor = await this.resolveInstructor(user.id);
    if (submission.assignment?.offering?.instructorId !== instructor.id) {
      throw new ForbiddenException('You cannot view submissions for this assignment');
    }

    return this.serializeSubmission(submission);
  }

  async create(assignmentId: string, dto: CreateSubmissionDto, user: UserResponse) {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Only students can create submissions');
    }

    const assignment = await this.getAssignmentRecord(assignmentId);
    const student = await this.resolveStudent(user.id);

    if (student.status !== 'ACTIVE') {
      throw new ConflictException('Student must be ACTIVE to submit work');
    }

    const enrollment = await this.database.client.orm.public.Enrollment.where({
      studentId: student.id,
      offeringId: assignment.offeringId,
      status: 'ACTIVE',
    })
      .select('id')
      .all()
      .first();

    if (enrollment === null) {
      throw new ConflictException('Student is not actively enrolled in this offering');
    }

    const content = dto.content === undefined ? null : dto.content.trim();
    const fileUrl = dto.fileUrl === undefined ? null : dto.fileUrl.trim();
    if ((content === null || content === '') && (fileUrl === null || fileUrl === '')) {
      throw new BadRequestException('Submission requires content or fileUrl');
    }

    const existing = await this.database.client.orm.public.Submission.where({
      assignmentId,
      studentId: student.id,
    })
      .select(
        'id',
        'assignmentId',
        'studentId',
        'content',
        'fileUrl',
        'score',
        'status',
        'submittedAt',
        'createdAt',
        'updatedAt',
      )
      .include('assignment', (assignment) => assignment.select('id', 'dueDate', 'maxScore'))
      .all()
      .first();

    if (existing !== null) {
      if (existing.status === 'GRADED') {
        throw new ConflictException('Graded submission cannot be modified by the student');
      }

      const nextSubmission = await this.database.client.orm.public.Submission.where({
        id: existing.id,
      }).update({
        content: content ?? existing.content,
        fileUrl: fileUrl ?? existing.fileUrl,
        submittedAt: new Date().toISOString(),
        status: this.resolveSubmissionStatus(new Date(), assignment.dueDate),
      });

      if (nextSubmission === null) {
        throw new NotFoundException('Submission not found');
      }

      return this.getById(nextSubmission.id, user);
    }

    const created = await this.database.client.orm.public.Submission.create({
      assignmentId,
      studentId: student.id,
      content: content ?? undefined,
      fileUrl: fileUrl ?? undefined,
      score: null,
      status: this.resolveSubmissionStatus(new Date(), assignment.dueDate),
      submittedAt: new Date().toISOString(),
    });

    return this.getById(created.id, user);
  }

  async update(id: string, dto: UpdateSubmissionDto, user: UserResponse) {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException('Only students can update submissions');
    }

    const submission = await this.getSubmissionRecord(id);
    const student = await this.resolveStudent(user.id);

    if (submission.studentId !== student.id) {
      throw new ForbiddenException('You cannot update another student submission');
    }

    if (submission.status === 'GRADED') {
      throw new ConflictException('Graded submission cannot be modified by the student');
    }

    const assignment = await this.getAssignmentRecord(submission.assignmentId);
    const content = dto.content === undefined ? submission.content : dto.content.trim();
    const fileUrl = dto.fileUrl === undefined ? submission.fileUrl : dto.fileUrl.trim();

    if ((content === null || content === '') && (fileUrl === null || fileUrl === '')) {
      throw new BadRequestException('Submission requires content or fileUrl');
    }

    const updated = await this.database.client.orm.public.Submission.where({ id }).update({
      content: content ?? null,
      fileUrl: fileUrl ?? null,
      submittedAt: new Date().toISOString(),
      status: this.resolveSubmissionStatus(new Date(), assignment.dueDate),
    });

    if (updated === null) {
      throw new NotFoundException('Submission not found');
    }

    return this.getById(updated.id, user);
  }

  async listForAssignment(assignmentId: string, user: UserResponse) {
    const assignment = await this.getAssignmentRecord(assignmentId);

    if (user.role === 'ADMIN') {
      return this.listSubmissionSummaries(assignmentId);
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      if (assignment.offering?.instructorId !== instructor.id) {
        throw new ForbiddenException('You cannot access submissions for this assignment');
      }
      return this.listSubmissionSummaries(assignmentId);
    }

    throw new ForbiddenException('Only instructors or admins can list assignment submissions');
  }

  async grade(id: string, dto: GradeSubmissionDto, user: UserResponse) {
    if (user.role === 'STUDENT') {
      throw new ForbiddenException('Students cannot grade submissions');
    }

    const submission = await this.getSubmissionRecord(id);
    const assignment = await this.getAssignmentRecord(submission.assignmentId);

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      if (assignment.offering?.instructorId !== instructor.id) {
        throw new ForbiddenException('You cannot grade submissions in this offering');
      }
    }

    if (!Number.isFinite(dto.score) || dto.score < 0) {
      throw new BadRequestException('score must be greater than or equal to 0');
    }

    if (dto.score > assignment.maxScore) {
      throw new BadRequestException('score cannot exceed assignment maxScore');
    }

    const updated = await this.database.client.orm.public.Submission.where({ id }).update({
      score: dto.score,
      status: 'GRADED',
    });

    if (updated === null) {
      throw new NotFoundException('Submission not found');
    }

    return this.getById(updated.id, user);
  }

  private async listSubmissionSummaries(assignmentId: string) {
    const rows = await this.database.client.orm.public.Submission.where({
      assignmentId,
    })
      .select(
        'id',
        'assignmentId',
        'studentId',
        'score',
        'status',
        'submittedAt',
        'createdAt',
        'updatedAt',
      )
      .include('student', (student) =>
        student.select('id', 'studentNumber').include('user', (user) =>
          user.select('id', 'firstName', 'lastName'),
        ),
      )
      .all();

    return rows.map((row) => ({
      id: row.id,
      student: row.student
        ? {
            id: row.student.id,
            studentNumber: row.student.studentNumber,
            firstName: row.student.user?.firstName ?? null,
            lastName: row.student.user?.lastName ?? null,
          }
        : null,
      status: row.status,
      score: row.score,
      submittedAt: row.submittedAt,
    }));
  }

  private async getSubmissionRecord(id: string) {
    const submission = await this.database.client.orm.public.Submission.where({ id })
      .select(
        'id',
        'assignmentId',
        'studentId',
        'content',
        'fileUrl',
        'score',
        'status',
        'submittedAt',
        'createdAt',
        'updatedAt',
      )
      .include('assignment', (assignment) =>
        assignment
          .select('id', 'offeringId', 'dueDate', 'maxScore')
          .include('offering', (offering) =>
            offering.select('id', 'instructorId').include('course', (course) =>
              course.select('id', 'code', 'title'),
            ),
          ),
      )
      .include('student', (student) =>
        student.select('id', 'studentNumber').include('user', (user) =>
          user.select('id', 'firstName', 'lastName'),
        ),
      )
      .all()
      .first();

    if (submission === null) {
      throw new NotFoundException('Submission not found');
    }

    return submission;
  }

  private async getAssignmentRecord(id: string) {
    const assignment = await this.database.client.orm.public.Assignment.where({ id })
      .select(
        'id',
        'offeringId',
        'instructorId',
        'title',
        'description',
        'dueDate',
        'maxScore',
        'createdAt',
        'updatedAt',
      )
      .include('offering', (offering) =>
        offering.select('id', 'instructorId', 'section').include('course', (course) =>
          course.select('id', 'code', 'title'),
        ),
      )
      .include('instructor', (instructor) =>
        instructor.select('id', 'employeeNumber').include('user', (user) =>
          user.select('id', 'firstName', 'lastName'),
        ),
      )
      .all()
      .first();

    if (assignment === null) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  private async resolveStudent(userId: string) {
    const student = await this.database.client.orm.public.Student.where({ userId })
      .select('id', 'userId', 'status')
      .all()
      .first();

    if (student === null) {
      throw new ForbiddenException('No Student record exists for this account');
    }

    return student;
  }

  private async resolveInstructor(userId: string) {
    const instructor = await this.database.client.orm.public.Instructor.where({ userId })
      .select('id', 'userId')
      .all()
      .first();

    if (instructor === null) {
      throw new ForbiddenException('No Instructor record exists for this account');
    }

    return instructor;
  }

  private resolveSubmissionStatus(now: Date, dueDate: string | Date) {
    const due = new Date(dueDate);
    return now.getTime() <= due.getTime() ? 'SUBMITTED' : 'LATE';
  }

  private serializeSubmission(submission: Record<string, any>) {
    return {
      id: submission.id,
      assignmentId: submission.assignmentId,
      studentId: submission.studentId,
      content: submission.content ?? null,
      fileUrl: submission.fileUrl ?? null,
      score: submission.score ?? null,
      status: submission.status,
      submittedAt: submission.submittedAt,
      student: submission.student
        ? {
            id: submission.student.id,
            studentNumber: submission.student.studentNumber,
            firstName: submission.student.user?.firstName ?? null,
            lastName: submission.student.user?.lastName ?? null,
          }
        : null,
      assignment: submission.assignment
        ? {
            id: submission.assignment.id,
            offeringId: submission.assignment.offeringId,
            dueDate: submission.assignment.dueDate,
            maxScore: submission.assignment.maxScore,
            offering: submission.assignment.offering
              ? {
                  id: submission.assignment.offering.id,
                  instructorId: submission.assignment.offering.instructorId,
                  course: submission.assignment.offering.course
                    ? {
                        id: submission.assignment.offering.course.id,
                        code: submission.assignment.offering.course.code,
                        title: submission.assignment.offering.course.title,
                      }
                    : null,
                }
              : null,
          }
        : null,
      createdAt: submission.createdAt,
      updatedAt: submission.updatedAt,
    };
  }
}
