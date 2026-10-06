import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { CreateCurriculumCourseDto } from './dto/create-curriculum-course.dto.js';
import { UpdateCurriculumCourseDto } from './dto/update-curriculum-course.dto.js';

const SEMESTERS = ['FIRST', 'SECOND', 'SUMMER'] as const;
const COURSE_TYPES = ['CORE', 'ELECTIVE', 'GENERAL'] as const;

@Injectable()
export class CurriculumService {
  constructor(private readonly database: DatabaseService) {}

  async list(programId: string) {
    await this.getProgram(programId);

    return this.database.client.orm.public.CurriculumCourse.where({ programId })
      .select(
        'id',
        'programId',
        'courseId',
        'year',
        'semester',
        'credits',
        'courseType',
        'isRequired',
        'createdAt',
        'updatedAt',
      )
      .include('course', (course) => course.select('id', 'code', 'title'))
      .all();
  }

  async create(programId: string, dto: CreateCurriculumCourseDto) {
    const program = await this.getProgram(programId);
    this.validateCurriculumFields(dto, program.durationYears);
    await this.ensureCourseExists(dto.courseId);

    const duplicate =
      await this.database.client.orm.public.CurriculumCourse.where({
        programId,
        courseId: dto.courseId,
      })
        .select('id')
        .all()
        .first();

    if (duplicate !== null) {
      throw new ConflictException(
        'Course is already part of this Program curriculum',
      );
    }

    try {
      const curriculumCourse =
        await this.database.client.orm.public.CurriculumCourse.create({
          programId,
          courseId: dto.courseId,
          year: dto.year,
          semester: dto.semester,
          credits: dto.credits,
          courseType: dto.courseType,
          isRequired: dto.isRequired,
        });

      return this.getById(programId, curriculumCourse.id);
    } catch (error) {
      this.handleDatabaseError(error, 'create');
    }
  }

  async update(programId: string, id: string, dto: UpdateCurriculumCourseDto) {
    const program = await this.getProgram(programId);
    const existing = await this.getCurriculumCourse(programId, id);
    const year = dto.year ?? existing.year;

    this.validateCurriculumFields(
      {
        year,
        semester: dto.semester ?? existing.semester,
        credits: dto.credits ?? existing.credits,
        courseType: dto.courseType ?? existing.courseType,
        isRequired: dto.isRequired ?? existing.isRequired,
      },
      program.durationYears,
    );

    const update: {
      year?: number;
      semester?: 'FIRST' | 'SECOND' | 'SUMMER';
      credits?: number;
      courseType?: 'CORE' | 'ELECTIVE' | 'GENERAL';
      isRequired?: boolean;
    } = {};

    if (dto.year !== undefined) update.year = dto.year;
    if (dto.semester !== undefined) update.semester = dto.semester;
    if (dto.credits !== undefined) update.credits = dto.credits;
    if (dto.courseType !== undefined) update.courseType = dto.courseType;
    if (dto.isRequired !== undefined) update.isRequired = dto.isRequired;

    try {
      const updated =
        await this.database.client.orm.public.CurriculumCourse.where({
          id,
          programId,
        }).update(update);

      if (updated === null) {
        throw new NotFoundException('Curriculum course not found');
      }

      return this.getById(programId, id);
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleDatabaseError(error, 'update');
    }
  }

  async remove(programId: string, id: string) {
    await this.getProgram(programId);
    await this.getCurriculumCourse(programId, id);

    try {
      const removed =
        await this.database.client.orm.public.CurriculumCourse.where({
          id,
          programId,
        }).delete();

      if (removed === null) {
        throw new NotFoundException('Curriculum course not found');
      }

      return {
        id: removed.id,
        programId: removed.programId,
        courseId: removed.courseId,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      this.handleDatabaseError(error, 'delete');
    }
  }

  private async getProgram(programId: string) {
    const program = await this.database.client.orm.public.Program.where({
      id: programId,
    })
      .select('id', 'durationYears')
      .all()
      .first();

    if (program === null) {
      throw new NotFoundException('Program not found');
    }

    return program;
  }

  private async getCurriculumCourse(programId: string, id: string) {
    const curriculumCourse =
      await this.database.client.orm.public.CurriculumCourse.where({
        id,
        programId,
      })
        .all()
        .first();

    if (curriculumCourse === null) {
      throw new NotFoundException('Curriculum course not found');
    }

    return curriculumCourse;
  }

  private async getById(programId: string, id: string) {
    const curriculumCourse =
      await this.database.client.orm.public.CurriculumCourse.where({
        id,
        programId,
      })
        .select(
          'id',
          'programId',
          'courseId',
          'year',
          'semester',
          'credits',
          'courseType',
          'isRequired',
          'createdAt',
          'updatedAt',
        )
        .include('course', (course) => course.select('id', 'code', 'title'))
        .all()
        .first();

    if (curriculumCourse === null) {
      throw new NotFoundException('Curriculum course not found');
    }

    return curriculumCourse;
  }

  private async ensureCourseExists(courseId: string): Promise<void> {
    const course = await this.database.client.orm.public.Course.where({
      id: courseId,
    })
      .select('id')
      .all()
      .first();

    if (course === null) {
      throw new NotFoundException('Course not found');
    }
  }

  private validateCurriculumFields(
    data: {
      year: number;
      semester: string;
      credits: number;
      courseType: string;
      isRequired: boolean;
    },
    durationYears: number,
  ): void {
    if (!Number.isInteger(data.year) || data.year < 1) {
      throw new BadRequestException(
        'Curriculum year must be a positive integer',
      );
    }

    if (data.year > durationYears) {
      throw new BadRequestException(
        'Curriculum year cannot exceed Program durationYears',
      );
    }

    if (!SEMESTERS.includes(data.semester as (typeof SEMESTERS)[number])) {
      throw new BadRequestException('Invalid semester');
    }

    if (!Number.isInteger(data.credits) || data.credits < 1) {
      throw new BadRequestException('Credits must be a positive integer');
    }

    if (
      !COURSE_TYPES.includes(data.courseType as (typeof COURSE_TYPES)[number])
    ) {
      throw new BadRequestException('Invalid courseType');
    }

    if (typeof data.isRequired !== 'boolean') {
      throw new BadRequestException('isRequired must be a boolean');
    }
  }

  private handleDatabaseError(error: unknown, operation: string): never {
    const databaseError = error as { code?: string };

    if (databaseError?.code === 'P2002') {
      throw new ConflictException(
        'Course is already part of this Program curriculum',
      );
    }

    if (databaseError?.code === 'P2003') {
      if (operation === 'delete') {
        throw new ConflictException(
          'Cannot delete a curriculum course with dependent records',
        );
      }
      throw new BadRequestException(
        'Curriculum course references a record that does not exist',
      );
    }

    throw new InternalServerErrorException(
      `Unable to ${operation} curriculum course`,
    );
  }
}
