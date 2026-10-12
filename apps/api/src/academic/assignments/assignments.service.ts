import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import type { UserResponse } from '../../users/entities/user.entity.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { UpdateAssignmentDto } from './dto/update-assignment.dto.js';

@Injectable()
export class AssignmentsService {
  constructor(private readonly database: DatabaseService) {}

  async list(user: UserResponse) {
    const assignments = await this.database.client.orm.public.Assignment.select(
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
        instructor
          .select('id', 'employeeNumber')
          .include('user', (user) => user.select('id', 'firstName', 'lastName')),
      )
      .all();

    if (user.role === 'ADMIN') {
      return assignments.map((assignment) => this.serializeAssignment(assignment));
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      return assignments
        .filter((assignment) => assignment.offering?.instructorId === instructor.id)
        .map((assignment) => this.serializeAssignment(assignment));
    }

    const student = await this.resolveStudent(user.id);
    const activeOfferingIds = new Set(
      (
        await this.database.client.orm.public.Enrollment.where({
          studentId: student.id,
          status: 'ACTIVE',
        })
          .select('offeringId')
          .all()
      ).map((row) => row.offeringId),
    );

    return assignments
      .filter((assignment) => activeOfferingIds.has(assignment.offeringId))
      .map((assignment) => this.serializeAssignment(assignment));
  }

  async listByOffering(offeringId: string, user: UserResponse) {
    const offering = await this.database.client.orm.public.CourseOffering.where({
      id: offeringId,
    })
      .select('id', 'instructorId')
      .all()
      .first();

    if (offering === null) {
      throw new NotFoundException('Course offering not found');
    }

    if (user.role === 'ADMIN') {
      return this.listAssignmentsForOffering(offeringId);
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      if (offering.instructorId !== instructor.id) {
        throw new ForbiddenException('You do not manage this course offering');
      }
      return this.listAssignmentsForOffering(offeringId);
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
      throw new ForbiddenException('Student is not actively enrolled in this course offering');
    }

    return this.listAssignmentsForOffering(offeringId);
  }

  async getById(id: string, user: UserResponse) {
    const assignment = await this.getAssignmentRecord(id);

    if (user.role === 'ADMIN') {
      return this.serializeAssignment(assignment);
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      if (assignment.offering?.instructorId !== instructor.id) {
        throw new ForbiddenException('You do not manage this assignment');
      }
      return this.serializeAssignment(assignment);
    }

    const student = await this.resolveStudent(user.id);
    const enrollment = await this.database.client.orm.public.Enrollment.where({
      studentId: student.id,
      offeringId: assignment.offeringId,
      status: 'ACTIVE',
    })
      .select('id')
      .all()
      .first();

    if (enrollment === null) {
      throw new ForbiddenException('Student is not actively enrolled in this assignment offering');
    }

    return this.serializeAssignment(assignment);
  }

  async create(offeringId: string, dto: CreateAssignmentDto, user: UserResponse) {
    if (user.role !== 'INSTRUCTOR') {
      throw new ForbiddenException('Only instructors can create assignments');
    }

    const instructor = await this.resolveInstructor(user.id);
    const offering = await this.database.client.orm.public.CourseOffering.where({
      id: offeringId,
    })
      .select('id', 'instructorId')
      .all()
      .first();

    if (offering === null) {
      throw new NotFoundException('Course offering not found');
    }

    if (offering.instructorId !== instructor.id) {
      throw new ForbiddenException('Instructor is not assigned to this course offering');
    }

    const title = typeof dto.title === 'string' ? dto.title.trim() : '';
    if (!title) {
      throw new BadRequestException('Assignment title is required');
    }

    const dueDate = new Date(dto.dueDate);
    if (Number.isNaN(dueDate.getTime())) {
      throw new BadRequestException('Assignment dueDate must be a valid date');
    }

    if (!Number.isFinite(dto.maxScore) || dto.maxScore <= 0) {
      throw new BadRequestException('maxScore must be a positive number');
    }

    const description =
      dto.description === undefined || dto.description === null
        ? null
        : dto.description.trim();

    try {
      const created = await this.database.client.orm.public.Assignment.create({
        offeringId,
        instructorId: instructor.id,
        title,
        description: description ?? null,
        dueDate: new Date(dueDate).toISOString(),
        maxScore: dto.maxScore,
      });

      return this.getById(created.id, user);
    } catch (error) {
      throw this.normalizeDatabaseError(error, 'create assignment');
    }
  }

  async update(id: string, dto: UpdateAssignmentDto, user: UserResponse) {
    const assignment = await this.getAssignmentRecord(id);

    if (user.role === 'ADMIN') {
      return this.applyAssignmentUpdate(id, assignment, dto);
    }

    if (user.role !== 'INSTRUCTOR') {
      throw new ForbiddenException('Only instructors can update assignments');
    }

    const instructor = await this.resolveInstructor(user.id);
    if (assignment.offering?.instructorId !== instructor.id) {
      throw new ForbiddenException('You do not manage this assignment');
    }

    return this.applyAssignmentUpdate(id, assignment, dto);
  }

  async remove(id: string, user: UserResponse) {
    const assignment = await this.getAssignmentRecord(id);

    if (user.role !== 'ADMIN' && user.role !== 'INSTRUCTOR') {
      throw new ForbiddenException('Only instructors or admins can delete assignments');
    }

    if (user.role === 'INSTRUCTOR') {
      const instructor = await this.resolveInstructor(user.id);
      if (assignment.offering?.instructorId !== instructor.id) {
        throw new ForbiddenException('You do not manage this assignment');
      }
    }

    const existingSubmission = await this.database.client.orm.public.Submission.where({
      assignmentId: id,
    })
      .select('id')
      .all()
      .first();

    if (existingSubmission !== null) {
      throw new ConflictException('Assignment cannot be deleted because submissions exist');
    }

    const removed = await this.database.client.orm.public.Assignment.where({ id }).delete();
    if (removed === null) {
      throw new NotFoundException('Assignment not found');
    }
    return this.serializeAssignment(removed);
  }

  private async listAssignmentsForOffering(offeringId: string) {
    const rows = await this.database.client.orm.public.Assignment.where({
      offeringId,
    })
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
        instructor
          .select('id', 'employeeNumber')
          .include('user', (user) => user.select('id', 'firstName', 'lastName')),
      )
      .all();

    return rows.map((row) => this.serializeAssignment(row));
  }

  private async applyAssignmentUpdate(
    id: string,
    assignment: Record<string, any>,
    dto: UpdateAssignmentDto,
  ) {
    const update: Record<string, unknown> = {};

    if (dto.title !== undefined) {
      const title = dto.title.trim();
      if (!title) {
        throw new BadRequestException('Assignment title cannot be empty');
      }
      update.title = title;
    }

    if (dto.description !== undefined) {
      update.description = dto.description === null ? null : dto.description.trim();
    }

    if (dto.dueDate !== undefined) {
      const due = new Date(dto.dueDate);
      if (Number.isNaN(due.getTime())) {
        throw new BadRequestException('Assignment dueDate must be a valid date');
      }
      update.dueDate = due.toISOString();
    }

    if (dto.maxScore !== undefined) {
      if (!Number.isFinite(dto.maxScore) || dto.maxScore <= 0) {
        throw new BadRequestException('maxScore must be a positive number');
      }
      update.maxScore = dto.maxScore;
    }

    if (Object.keys(update).length === 0) {
      return this.serializeAssignment(assignment);
    }

    const updated = await this.database.client.orm.public.Assignment.where({
      id,
    }).update(update);

    if (updated === null) {
      throw new NotFoundException('Assignment not found');
    }

    return this.getAssignmentRecord(id).then((record) => this.serializeAssignment(record));
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
        instructor
          .select('id', 'employeeNumber')
          .include('user', (user) => user.select('id', 'firstName', 'lastName')),
      )
      .all()
      .first();

    if (assignment === null) {
      throw new NotFoundException('Assignment not found');
    }

    return assignment;
  }

  private async resolveInstructor(userId: string) {
    const instructor = await this.database.client.orm.public.Instructor.where({
      userId,
    })
      .select('id', 'userId')
      .all()
      .first();

    if (instructor === null) {
      throw new ForbiddenException('No Instructor record exists for this account');
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

  private serializeAssignment(assignment: Record<string, any>) {
    return {
      id: assignment.id,
      offeringId: assignment.offeringId,
      instructorId: assignment.instructorId,
      title: assignment.title,
      description: assignment.description ?? null,
      dueDate: assignment.dueDate,
      maxScore: assignment.maxScore,
      offering: assignment.offering
        ? {
            id: assignment.offering.id,
            section: assignment.offering.section,
            instructorId: assignment.offering.instructorId,
            course: assignment.offering.course
              ? {
                  id: assignment.offering.course.id,
                  code: assignment.offering.course.code,
                  title: assignment.offering.course.title,
                }
              : null,
          }
        : null,
      instructor: assignment.instructor
        ? {
            id: assignment.instructor.id,
            employeeNumber: assignment.instructor.employeeNumber,
            firstName: assignment.instructor.user?.firstName ?? null,
            lastName: assignment.instructor.user?.lastName ?? null,
          }
        : null,
      createdAt: assignment.createdAt,
      updatedAt: assignment.updatedAt,
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
