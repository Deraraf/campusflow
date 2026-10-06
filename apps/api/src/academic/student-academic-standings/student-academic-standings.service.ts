import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateStudentAcademicStandingDto } from './dto/create-student-academic-standing.dto.js';
import { UpdateStudentAcademicStandingDto } from './dto/update-student-academic-standing.dto.js';

@Injectable()
export class StudentAcademicStandingsService {
  constructor(private readonly database: DatabaseService) {}

  async list(studentId: string): Promise<unknown[]> {
    await this.getStudent(studentId);
    return this.database.client.orm.public.StudentAcademicStanding.where({
      studentId,
    })
      .select(
        'id',
        'studentId',
        'academicTermId',
        'programYear',
        'createdAt',
        'updatedAt',
      )
      .include('academicTerm', (term) =>
        term
          .select('id', 'semester', 'academicYearId', 'isCurrent')
          .include('academicYear', (year) => year.select('id', 'name')),
      )
      .all();
  }

  async create(
    studentId: string,
    dto: CreateStudentAcademicStandingDto,
  ): Promise<unknown> {
    const student = await this.getStudent(studentId);
    this.validateProgramYear(dto.programYear, student.durationYears);
    await this.ensureTermExists(dto.academicTermId);
    await this.ensureUnique(studentId, dto.academicTermId);

    try {
      const standing =
        await this.database.client.orm.public.StudentAcademicStanding.create({
          studentId,
          academicTermId: dto.academicTermId,
          programYear: dto.programYear,
        });
      return this.getById(studentId, standing.id);
    } catch (error) {
      this.handleDatabaseError(error, 'create');
    }
  }

  async update(
    studentId: string,
    id: string,
    dto: UpdateStudentAcademicStandingDto,
  ): Promise<unknown> {
    const student = await this.getStudent(studentId);
    const existing = await this.getStanding(studentId, id);
    const academicTermId = dto.academicTermId ?? existing.academicTermId;
    const programYear = dto.programYear ?? existing.programYear;

    this.validateProgramYear(programYear, student.durationYears);
    if (dto.academicTermId !== undefined) {
      await this.ensureTermExists(academicTermId);
      await this.ensureUnique(studentId, academicTermId, id);
    }

    const update: { academicTermId?: string; programYear?: number } = {};
    if (dto.academicTermId !== undefined)
      update.academicTermId = academicTermId;
    if (dto.programYear !== undefined) update.programYear = programYear;
    if (Object.keys(update).length === 0) return this.getById(studentId, id);

    try {
      const updated =
        await this.database.client.orm.public.StudentAcademicStanding.where({
          id,
          studentId,
        }).update(update);
      if (updated === null) {
        throw new NotFoundException('Student Academic Standing not found');
      }
      return this.getById(studentId, id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleDatabaseError(error, 'update');
    }
  }

  async getCurrent(studentId: string): Promise<unknown> {
    await this.getStudent(studentId);
    const currentTerm =
      await this.database.client.orm.public.AcademicTerm.where({
        isCurrent: true,
      })
        .select('id')
        .all()
        .first();

    if (currentTerm === null) {
      throw new NotFoundException('Current AcademicTerm not found');
    }

    const standing =
      await this.database.client.orm.public.StudentAcademicStanding.where({
        studentId,
        academicTermId: currentTerm.id,
      })
        .select('id')
        .all()
        .first();

    if (standing === null) {
      throw new NotFoundException(
        'No Student Academic Standing exists for the current AcademicTerm',
      );
    }
    return this.getById(studentId, standing.id);
  }

  async remove(studentId: string, id: string): Promise<unknown> {
    await this.getStanding(studentId, id);

    try {
      const removed =
        await this.database.client.orm.public.StudentAcademicStanding.where({
          id,
          studentId,
        }).delete();
      if (removed === null) {
        throw new NotFoundException('Student Academic Standing not found');
      }
      return {
        id: removed.id,
        studentId: removed.studentId,
        academicTermId: removed.academicTermId,
        programYear: removed.programYear,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleDatabaseError(error, 'delete');
    }
  }

  private async getStudent(studentId: string) {
    const student = await this.database.client.orm.public.Student.where({
      id: studentId,
    })
      .select('id', 'programId')
      .all()
      .first();

    if (student === null) {
      throw new NotFoundException('Student not found');
    }

    const program = await this.database.client.orm.public.Program.where({
      id: student.programId,
    })
      .select('id', 'durationYears')
      .all()
      .first();
    if (program === null) {
      throw new NotFoundException('Student Program not found');
    }

    return { ...student, durationYears: program.durationYears };
  }

  private async getStanding(studentId: string, id: string) {
    const standing =
      await this.database.client.orm.public.StudentAcademicStanding.where({
        id,
        studentId,
      })
        .all()
        .first();
    if (standing === null) {
      throw new NotFoundException('Student Academic Standing not found');
    }
    return standing;
  }

  private async getById(studentId: string, id: string): Promise<unknown> {
    const standing =
      await this.database.client.orm.public.StudentAcademicStanding.where({
        id,
        studentId,
      })
        .select(
          'id',
          'studentId',
          'academicTermId',
          'programYear',
          'createdAt',
          'updatedAt',
        )
        .include('academicTerm', (term) =>
          term
            .select('id', 'semester', 'academicYearId', 'isCurrent')
            .include('academicYear', (year) => year.select('id', 'name')),
        )
        .all()
        .first();
    if (standing === null) {
      throw new NotFoundException('Student Academic Standing not found');
    }
    return standing;
  }

  private async ensureTermExists(academicTermId: string): Promise<void> {
    const term = await this.database.client.orm.public.AcademicTerm.where({
      id: academicTermId,
    })
      .select('id')
      .all()
      .first();
    if (term === null) {
      throw new NotFoundException('AcademicTerm not found');
    }
  }

  private async ensureUnique(
    studentId: string,
    academicTermId: string,
    excludeId?: string,
  ): Promise<void> {
    const duplicate =
      await this.database.client.orm.public.StudentAcademicStanding.where({
        studentId,
        academicTermId,
      })
        .select('id')
        .all()
        .first();
    if (duplicate !== null && duplicate.id !== excludeId) {
      throw new ConflictException(
        'Student already has an Academic Standing for this AcademicTerm',
      );
    }
  }

  private validateProgramYear(
    programYear: number,
    durationYears: number,
  ): void {
    if (!Number.isInteger(programYear) || programYear < 1) {
      throw new BadRequestException('programYear must be a positive integer');
    }
    if (programYear > durationYears) {
      throw new BadRequestException(
        'programYear cannot exceed Program durationYears',
      );
    }
  }

  private handleDatabaseError(error: unknown, operation: string): never {
    const databaseError = error as { code?: string };
    if (databaseError?.code === 'P2002') {
      throw new ConflictException(
        'Student already has an Academic Standing for this AcademicTerm',
      );
    }
    if (databaseError?.code === 'P2003') {
      if (operation === 'delete') {
        throw new ConflictException(
          'Cannot delete Student Academic Standing with dependent records',
        );
      }
      throw new BadRequestException(
        'Student Academic Standing references an invalid record',
      );
    }
    throw new InternalServerErrorException(
      `Unable to ${operation} Student Academic Standing`,
    );
  }
}
