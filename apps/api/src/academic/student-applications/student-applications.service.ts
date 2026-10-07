import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { UserResponse } from '../../users/entities/user.entity.js';
import { ApproveStudentApplicationDto } from './dto/approve-student-application.dto.js';
import { CreateStudentApplicationDto } from './dto/create-student-application.dto.js';
import { RejectStudentApplicationDto } from './dto/reject-student-application.dto.js';

const ACTIVE_APPLICATION_STATUSES = ['PENDING', 'UNDER_REVIEW'] as const;

@Injectable()
export class StudentApplicationsService {
  constructor(private readonly database: DatabaseService) {}

  async create(
    user: UserResponse,
    dto: CreateStudentApplicationDto,
  ): Promise<unknown> {
    if (
      user.role !== 'STUDENT' ||
      user.status !== 'ACTIVE' ||
      user.emailVerifiedAt === null
    ) {
      throw new ForbiddenException('An active STUDENT account is required');
    }

    const existingStudent = await this.database.client.orm.public.Student.where(
      {
        userId: user.id,
      },
    )
      .select('id')
      .all()
      .first();

    if (existingStudent !== null) {
      throw new ConflictException(
        'A Student record already exists for this account',
      );
    }

    const program = await this.database.client.orm.public.Program.where({
      id: dto.programId,
    })
      .select('id')
      .all()
      .first();

    if (program === null) {
      throw new NotFoundException('Program not found');
    }

    const applications =
      await this.database.client.orm.public.StudentApplication.where({
        userId: user.id,
      }).all();
    const activeApplication = applications.find((application) =>
      ACTIVE_APPLICATION_STATUSES.includes(
        application.status as (typeof ACTIVE_APPLICATION_STATUSES)[number],
      ),
    );

    if (activeApplication !== undefined) {
      throw new ConflictException(
        'An active Student application already exists for this account',
      );
    }

    const applicationNumber = `APP-${randomUUID().toUpperCase()}`;

    try {
      const application =
        await this.database.client.orm.public.StudentApplication.create({
          userId: user.id,
          programId: dto.programId,
          studentId: null,
          status: 'PENDING',
          applicationNumber,
          reviewedAt: null,
          rejectionReason: null,
        });

      return this.getById(application.id);
    } catch (error) {
      this.handleDatabaseError(error, 'create');
    }
  }

  async listMine(userId: string): Promise<unknown[]> {
    return this.database.client.orm.public.StudentApplication.where({ userId })
      .select(
        'id',
        'userId',
        'programId',
        'studentId',
        'status',
        'applicationNumber',
        'submittedAt',
        'reviewedAt',
        'rejectionReason',
        'createdAt',
        'updatedAt',
      )
      .include('program', (program) =>
        program
          .select('id', 'name', 'code')
          .include('department', (department) =>
            department.select('id', 'name', 'code'),
          ),
      )
      .include('student', (student) => student.select('id', 'studentNumber'))
      .all();
  }

  async getMine(userId: string, id: string): Promise<unknown> {
    const application =
      await this.database.client.orm.public.StudentApplication.where({
        id,
        userId,
      })
        .select(
          'id',
          'userId',
          'programId',
          'studentId',
          'status',
          'applicationNumber',
          'submittedAt',
          'reviewedAt',
          'rejectionReason',
          'createdAt',
          'updatedAt',
        )
        .include('program', (program) =>
          program
            .select('id', 'name', 'code')
            .include('department', (department) =>
              department.select('id', 'name', 'code'),
            ),
        )
        .include('student', (student) => student.select('id', 'studentNumber'))
        .all()
        .first();

    if (application === null) {
      throw new NotFoundException('Student application not found');
    }
    return application;
  }

  async listAll(): Promise<unknown[]> {
    return this.database.client.orm.public.StudentApplication.select(
      'id',
      'userId',
      'programId',
      'studentId',
      'status',
      'applicationNumber',
      'submittedAt',
      'reviewedAt',
      'rejectionReason',
      'createdAt',
      'updatedAt',
    )
      .include('user', (user) =>
        user.select('id', 'firstName', 'lastName', 'email'),
      )
      .include('program', (program) =>
        program
          .select('id', 'name', 'code')
          .include('department', (department) =>
            department.select('id', 'name', 'code'),
          ),
      )
      .include('student', (student) => student.select('id', 'studentNumber'))
      .all();
  }

  async getById(id: string): Promise<unknown> {
    const application =
      await this.database.client.orm.public.StudentApplication.where({ id })
        .select(
          'id',
          'userId',
          'programId',
          'studentId',
          'status',
          'applicationNumber',
          'submittedAt',
          'reviewedAt',
          'rejectionReason',
          'createdAt',
          'updatedAt',
        )
        .include('user', (user) =>
          user.select('id', 'firstName', 'lastName', 'email'),
        )
        .include('program', (program) =>
          program
            .select('id', 'name', 'code')
            .include('department', (department) =>
              department.select('id', 'name', 'code'),
            ),
        )
        .include('student', (student) => student.select('id', 'studentNumber'))
        .all()
        .first();

    if (application === null) {
      throw new NotFoundException('Student application not found');
    }
    return application;
  }

  async cancel(userId: string, id: string): Promise<unknown> {
    const application = await this.getOwnedRecord(userId, id);

    if (application.status !== 'PENDING') {
      throw new ConflictException('Only PENDING applications can be cancelled');
    }

    const updated =
      await this.database.client.orm.public.StudentApplication.where({
        id,
        userId,
        status: 'PENDING',
      }).update({ status: 'CANCELLED' });

    if (updated === null) {
      throw new ConflictException('Student application status has changed');
    }
    return this.getMine(userId, id);
  }

  async review(id: string): Promise<unknown> {
    const application = await this.getRecord(id);

    if (application.status !== 'PENDING') {
      throw new ConflictException('Only PENDING applications can enter review');
    }

    const updated =
      await this.database.client.orm.public.StudentApplication.where({
        id,
        status: 'PENDING',
      }).update({ status: 'UNDER_REVIEW' });

    if (updated === null) {
      throw new ConflictException('Student application status has changed');
    }
    return this.getById(id);
  }

  async reject(id: string, dto: RejectStudentApplicationDto): Promise<unknown> {
    const rejectionReason = dto.rejectionReason.trim();
    if (!rejectionReason) {
      throw new BadRequestException('rejectionReason is required');
    }

    const application = await this.getRecord(id);
    if (!['PENDING', 'UNDER_REVIEW'].includes(application.status)) {
      throw new ConflictException(
        'Only PENDING or UNDER_REVIEW applications can be rejected',
      );
    }

    const updated =
      await this.database.client.orm.public.StudentApplication.where({
        id,
        status: application.status,
      }).update({
        status: 'REJECTED',
        reviewedAt: new Date().toISOString(),
        rejectionReason,
      });

    if (updated === null) {
      throw new ConflictException('Student application status has changed');
    }
    return this.getById(id);
  }

  async approve(
    id: string,
    dto: ApproveStudentApplicationDto,
  ): Promise<unknown> {
    const studentNumber = dto.studentNumber.trim();
    if (!studentNumber) {
      throw new BadRequestException('studentNumber is required');
    }
    if (!Number.isInteger(dto.programYear) || dto.programYear < 1) {
      throw new BadRequestException('programYear must be a positive integer');
    }

    let result: { applicationId: string; studentId: string };
    try {
      result = await this.database.client.transaction(async (tx) => {
        const application = await tx.orm.public.StudentApplication.where({ id })
          .all()
          .first();

        if (application === null) {
          throw new NotFoundException('Student application not found');
        }
        if (application.status !== 'UNDER_REVIEW') {
          throw new ConflictException(
            'Only UNDER_REVIEW applications can be approved',
          );
        }
        if (application.studentId !== null) {
          throw new ConflictException(
            'Student application already has a Student record',
          );
        }

        const user = await tx.orm.public.User.where({ id: application.userId })
          .select('id', 'role', 'status', 'emailVerifiedAt')
          .all()
          .first();
        if (
          user === null ||
          user.role !== 'STUDENT' ||
          user.status !== 'ACTIVE' ||
          user.emailVerifiedAt === null
        ) {
          throw new BadRequestException(
            'Application user must be an active, verified STUDENT account',
          );
        }

        const existingStudent = await tx.orm.public.Student.where({
          userId: application.userId,
        })
          .select('id')
          .all()
          .first();
        if (existingStudent !== null) {
          throw new ConflictException(
            'A Student record already exists for the application user',
          );
        }

        const program = await tx.orm.public.Program.where({
          id: application.programId,
        })
          .select('id', 'durationYears')
          .all()
          .first();
        if (program === null) {
          throw new NotFoundException('Application Program not found');
        }
        if (dto.programYear > program.durationYears) {
          throw new BadRequestException(
            'programYear cannot exceed Program durationYears',
          );
        }

        const duplicateStudentNumber = await tx.orm.public.Student.where({
          studentNumber,
        })
          .select('id')
          .all()
          .first();
        if (duplicateStudentNumber !== null) {
          throw new ConflictException('studentNumber already exists');
        }

        const academicYear = await tx.orm.public.AcademicYear.where({
          id: dto.admissionAcademicYearId,
        })
          .select('id')
          .all()
          .first();
        if (academicYear === null) {
          throw new NotFoundException('Admission AcademicYear not found');
        }

        const academicTerm = await tx.orm.public.AcademicTerm.where({
          id: dto.academicTermId,
        })
          .select('id', 'academicYearId')
          .all()
          .first();
        if (academicTerm === null) {
          throw new NotFoundException('Initial AcademicTerm not found');
        }
        if (academicTerm.academicYearId !== dto.admissionAcademicYearId) {
          throw new BadRequestException(
            'Initial AcademicTerm must belong to the admission AcademicYear',
          );
        }

        const student = await tx.orm.public.Student.create({
          userId: application.userId,
          studentNumber,
          programId: application.programId,
          admissionAcademicYearId: dto.admissionAcademicYearId,
          status: 'ACTIVE',
        });

        await tx.orm.public.StudentAcademicStanding.create({
          studentId: student.id,
          academicTermId: dto.academicTermId,
          programYear: dto.programYear,
        });

        const approvedApplication =
          await tx.orm.public.StudentApplication.where({
            id,
            status: 'UNDER_REVIEW',
            studentId: null,
          }).update({
            status: 'APPROVED',
            studentId: student.id,
            reviewedAt: new Date().toISOString(),
            rejectionReason: null,
          });

        if (approvedApplication === null) {
          throw new ConflictException('Student application status has changed');
        }

        return { applicationId: id, studentId: student.id };
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.handleDatabaseError(error, 'approve');
    }

    return {
      application: await this.getById(result.applicationId),
      student: await this.getStudentSummary(result.studentId),
    };
  }

  private async getRecord(id: string) {
    const application =
      await this.database.client.orm.public.StudentApplication.where({ id })
        .all()
        .first();
    if (application === null) {
      throw new NotFoundException('Student application not found');
    }
    return application;
  }

  private async getOwnedRecord(userId: string, id: string) {
    const application = await this.getRecord(id);
    if (application.userId !== userId) {
      throw new NotFoundException('Student application not found');
    }
    return application;
  }

  private async getStudentSummary(studentId: string): Promise<unknown> {
    const student = await this.database.client.orm.public.Student.where({
      id: studentId,
    })
      .select(
        'id',
        'studentNumber',
        'userId',
        'programId',
        'admissionAcademicYearId',
        'status',
      )
      .all()
      .first();
    if (student === null) {
      throw new InternalServerErrorException(
        'Approved Student record not found',
      );
    }
    return student;
  }

  private handleDatabaseError(error: unknown, operation: string): never {
    const databaseError = error as { code?: string };
    if (databaseError?.code === 'P2002') {
      throw new ConflictException(
        operation === 'approve'
          ? 'studentNumber or Student admission record already exists'
          : 'Student application number already exists',
      );
    }
    if (databaseError?.code === 'P2003') {
      throw new BadRequestException(
        'Student application references an invalid record',
      );
    }
    throw new InternalServerErrorException(
      `Unable to ${operation} Student application`,
    );
  }
}
